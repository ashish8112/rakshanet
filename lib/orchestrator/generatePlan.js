// Orchestrator: runs the four agents in order and saves a new proposed Plan.
//   1. Incident Assessment  (Gemini)  how bad, what is needed
//   2. Route and Logistics  (tools)   nearest free units, hospitals, shelters
//   3. Resource Allocation  (Gemini)  which unit goes where
//   4. Command and Planning (Gemini)  plan summary, or "investigate" a vague incident
// Loop guard: at most MAX_INVESTIGATE_ROUNDS "investigate" rounds, then propose anyway.
import { connectDB, Incident, Resource, Plan, AgentLog } from "@/lib/db";
import { assessIncident } from "@/lib/agents/incidentAssessment";
import { planRoutes } from "@/lib/agents/routeLogistics";
import { allocateResources } from "@/lib/agents/resourceAllocation";
import { commandPlan } from "@/lib/agents/commandPlanning";

const MAX_INVESTIGATE_ROUNDS = 2;
const OPEN_STATUSES = ["new", "assessing", "needs_info", "planned"];

function notFound(message) {
  const error = new Error(message);
  error.code = "INCIDENT_NOT_FOUND";
  return error;
}

export async function generatePlan({ trigger, incidentId }) {
  await connectDB();

  if (incidentId && !(await Incident.exists({ _id: incidentId }))) {
    throw notFound("Could not generate a plan; check that the incident exists.");
  }
  const incidents = await Incident.find({ status: { $in: OPEN_STATUSES } }).sort({ reportedAt: 1 });
  if (incidents.length === 0) {
    throw notFound("Could not generate a plan; there are no open incidents to plan for.");
  }

  const previous = await Plan.findOne().sort({ version: -1 });
  const version = (previous?.version ?? 0) + 1;
  const logs = [];
  const log = async (agent, message, output = {}, forIncident = null) => {
    logs.push(await AgentLog.create({ planVersion: version, incidentId: forIncident, agent, message, output }));
  };

  await log("orchestrator", `Plan v${version} started (trigger: ${trigger}) for ${incidents.length} open incident${incidents.length === 1 ? "" : "s"}.`,
    { trigger, incidentId: incidentId ?? null, incidentIds: incidents.map((i) => i.id) });

  // 1. Incident Assessment: only new/unassessed incidents, or the one that triggered this plan.
  const toAssess = incidents.filter((i) => i.severity === null || String(i.id) === String(incidentId));
  const assessments = await Promise.all(toAssess.map((incident) => assessIncident(incident)));
  for (const [index, incident] of toAssess.entries()) {
    const output = assessments[index];
    incident.severity = output.severity;
    incident.severityConfidence = output.confidence;
    incident.requiredCapabilities = output.requiredCapabilities;
    incident.followUpQuestions = output.followUpQuestions;
    if (incident.peopleAffected === null && output.peopleEstimate !== null) incident.peopleAffected = output.peopleEstimate;
    incident.status = "assessing";
    await incident.save();
    await log("incident_assessment", `${incident.code}: severity ${output.severity}, ${output.confidence} confidence. ${output.reasoning}`, output, incident.id);
  }

  // Most severe first; ties: reported earlier first.
  incidents.sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0) || a.reportedAt - b.reportedAt);

  // 2. Route and Logistics: tool calls, no Gemini.
  const routed = [];
  for (const incident of incidents) {
    const { output, details } = await planRoutes(incident);
    routed.push({ incident, details });
    const nearest = details.candidates[0];
    await log("route_logistics",
      `${incident.code}: ${details.candidates.length} candidate unit${details.candidates.length === 1 ? "" : "s"}` +
      (nearest ? `, nearest ${nearest.code} ${nearest.distanceKm} km / ${nearest.etaMinutes} min` : "") +
      (details.destinationOptions.length ? `, ${details.destinationOptions.length} hospital/shelter option${details.destinationOptions.length === 1 ? "" : "s"}` : "") + ".",
      output, incident.id);
  }

  // Codes for readable logs and prompts (AMB-01 instead of a 24-character id).
  const codes = new Map();
  for (const r of await Resource.find({}, { code: 1 })) codes.set(String(r.id), r.code);
  for (const i of incidents) codes.set(String(i.id), i.code);
  const codeOf = (id) => codes.get(String(id)) ?? String(id);

  // Too vague to plan at all (low confidence and no known needs): ask first, no Gemini call needed.
  const investigated = [];
  for (const { incident } of routed) {
    if (incident.severityConfidence === "low" && incident.requiredCapabilities.length === 0) {
      const question = incident.followUpQuestions[0] ?? "What exactly happened, and is anyone hurt or trapped?";
      investigated.push({ incidentId: String(incident.id), question });
      await log("orchestrator", `${incident.code} is too vague to assign units; asking the dispatcher: ${question}`,
        { investigate: { incidentId: String(incident.id), question } }, incident.id);
    }
  }

  // 3 + 4. Allocation and command, with the investigate loop.
  let allocation;
  let command;
  for (let round = 0; ; round += 1) {
    const active = routed.filter(({ incident }) => !investigated.some((q) => q.incidentId === String(incident.id)));

    if (active.length === 0) {
      allocation = { assignments: [], uncovered: [], conflicts: [] };
      command = { action: "propose", summary: "No units assigned yet: every open incident needs more information from the dispatcher first.", alternatives: [], changes: [], investigate: null };
      break;
    }
    if (active.every(({ details }) => details.candidates.length === 0)) {
      allocation = { assignments: [], uncovered: active.map(({ incident }) => ({ incidentId: String(incident.id), reason: "No free unit with the required capability", expectedDelayMinutes: null })), conflicts: [] };
    } else {
      allocation = await allocateResources(active);
    }
    await log("resource_allocation",
      `${allocation.assignments.length} assignment${allocation.assignments.length === 1 ? "" : "s"}: ` +
      (allocation.assignments.map((a) => `${codeOf(a.resourceId)} -> ${codeOf(a.incidentId)}`).join(", ") || "none") +
      (allocation.uncovered.length ? `. Uncovered: ${allocation.uncovered.map((u) => codeOf(u.incidentId)).join(", ")}` : "") + ".",
      allocation);

    // Only low-confidence incidents not asked about yet may be investigated, and only while rounds remain.
    const askable = new Set(round < MAX_INVESTIGATE_ROUNDS
      ? active.filter(({ incident }) => incident.severityConfidence === "low").map(({ incident }) => String(incident.id))
      : []);
    command = await commandPlan({ incidents: active.map((r) => r.incident), allocation, codeOf, previous, askable });
    await log("command_planning",
      command.action === "investigate"
        ? `Investigate ${codeOf(command.investigate.incidentId)} before committing: ${command.investigate.question}`
        : command.summary,
      command, command.investigate?.incidentId ?? null);

    if (command.action !== "investigate") break;
    investigated.push(command.investigate);
    await log("orchestrator", `Round ${round + 1}: ${codeOf(command.investigate.incidentId)} set aside until the dispatcher answers; replanning the rest.`,
      { round: round + 1, investigate: command.investigate }, command.investigate.incidentId);
  }

  // Save incident statuses.
  for (const { incident } of routed) {
    const question = investigated.find((q) => q.incidentId === String(incident.id));
    if (question) {
      incident.status = "needs_info";
      if (!incident.followUpQuestions.includes(question.question)) incident.followUpQuestions.push(question.question);
    } else {
      incident.status = "planned";
    }
    await incident.save();
  }

  // Older proposals are replaced by this one.
  await Plan.updateMany({ status: "proposed" }, { $set: { status: "superseded" } });
  const plan = await Plan.create({
    version,
    status: "proposed",
    trigger,
    summary: command.summary,
    assignments: allocation.assignments,
    uncovered: allocation.uncovered,
    alternatives: command.alternatives,
    changes: command.changes,
    dispatcherNote: "",
  });

  await log("orchestrator",
    `Plan v${version} proposed: ${plan.assignments.length} assignment${plan.assignments.length === 1 ? "" : "s"}, ${plan.uncovered.length} uncovered` +
    (investigated.length ? `, ${investigated.length} incident${investigated.length === 1 ? "" : "s"} waiting for information` : "") + ". Waiting for dispatcher approval.",
    { planId: plan.id, investigated });

  return { plan, logs };
}
