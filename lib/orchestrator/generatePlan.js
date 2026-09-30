// Orchestrator: runs the four agents in order and saves a new proposed Plan.
//   1. Incident Assessment  (Gemini)  how bad, what is needed
//   2. Route and Logistics  (tools)   nearest free units, hospitals, shelters
//   3. Resource Allocation  (Gemini)  which unit goes where
//   4. Command and Planning (Gemini)  plan summary, or "investigate" a vague incident
// Loop guard: at most MAX_INVESTIGATE_ROUNDS "investigate" rounds, then propose anyway.
import { connectDB, Incident, Resource, Plan, AgentLog } from "@/lib/db";
import { assessIncident } from "@/lib/agents/incidentAssessment";
import { planRoutes, estimateWaitMinutes } from "@/lib/agents/routeLogistics";
import { allocateResources } from "@/lib/agents/resourceAllocation";
import { commandPlan } from "@/lib/agents/commandPlanning";
import { findNearestAvailable } from "@/lib/tools";

const MAX_INVESTIGATE_ROUNDS = 2;
const OPEN_STATUSES = ["new", "assessing", "needs_info", "planned"];

function notFound(message) {
  const error = new Error(message);
  error.code = "INCIDENT_NOT_FOUND";
  return error;
}

export async function generatePlan({ trigger, incidentId, resourceId }) {
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

  // Units already working on each incident (a reopened incident keeps the units still there),
  // and the units the previous plan chose (so a replan only changes what it must).
  const resources = await Resource.find();
  const resourceById = new Map(resources.map((r) => [String(r.id), r]));
  const unitInfo = (id) => { const r = resourceById.get(String(id)); return r && { code: r.code, kind: r.kind, capabilities: r.capabilities }; };
  const onSceneOf = (incident) => incident.assignedResources.map(unitInfo).filter(Boolean);
  const previousUnitsOf = (incident) => (previous?.assignments ?? [])
    .filter((a) => String(a.incidentId) === String(incident.id))
    .map((a) => resourceById.get(String(a.resourceId))?.code).filter(Boolean);
  const missingCapabilities = (incident, onScene) => incident.requiredCapabilities
    .filter((c) => ["medical", "fire", "rescue"].includes(c) && !onScene.some((u) => u.capabilities.includes(c)));

  // What caused this replan, in words the Command agent can explain (e.g. "AMB-03 is now unavailable").
  const triggerResource = resourceId ? resourceById.get(String(resourceId)) : null;
  const event = triggerResource ? `${triggerResource.code} is now ${triggerResource.status}` : `trigger: ${trigger}`;

  // 2. Route and Logistics: tool calls, no Gemini.
  const routed = [];
  const alreadyCovered = [];
  for (const incident of incidents) {
    const onScene = onSceneOf(incident);
    if (onScene.length > 0 && missingCapabilities(incident, onScene).length === 0) {
      alreadyCovered.push(incident);
      await log("route_logistics", `${incident.code}: already covered by ${onScene.map((u) => u.code).join(", ")}; no new units needed.`, {}, incident.id);
      continue;
    }
    const { output, details } = await planRoutes(incident);
    routed.push({ incident, details, onScene, previousUnits: previousUnitsOf(incident) });
    const nearest = details.candidates[0];
    await log("route_logistics",
      `${incident.code}: ${details.candidates.length} candidate unit${details.candidates.length === 1 ? "" : "s"}` +
      (nearest ? `, nearest ${nearest.code} ${nearest.distanceKm} km / ${nearest.etaMinutes} min` : "") +
      (details.destinationOptions.length ? `, ${details.destinationOptions.length} hospital/shelter option${details.destinationOptions.length === 1 ? "" : "s"}` : "") + ".",
      output, incident.id);
  }

  // Codes for readable logs and prompts (AMB-01 instead of a 24-character id).
  const codes = new Map();
  for (const r of resources) codes.set(String(r.id), r.code);
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

  // Coverage check (code, not Gemini): Gemini sets the priorities, but a free unit is never left idle
  // while an incident needs its capability. Most severe first, each missing need gets the nearest
  // free unit that is not used yet (tools: findNearestAvailable).
  const fillGaps = async (allocation, active) => {
    const used = new Set(allocation.assignments.map((a) => a.resourceId));
    const added = [];
    for (const { incident, onScene } of active) {
      const id = String(incident.id);
      const unitsHere = () => [...onScene, ...allocation.assignments.filter((a) => a.incidentId === id).map((a) => unitInfo(a.resourceId)).filter(Boolean)];
      for (const capability of missingCapabilities(incident, unitsHere())) {
        if (!missingCapabilities(incident, unitsHere()).includes(capability)) continue; // a unit added above covers it
        const options = await findNearestAvailable({ location: incident.location, capability, limit: 10 });
        const pick = options.find((o) => !used.has(String(o.resource.id)));
        if (!pick) continue;
        used.add(String(pick.resource.id));
        const assignment = {
          incidentId: id,
          resourceId: String(pick.resource.id),
          destinationId: null,
          distanceKm: pick.distanceKm,
          etaMinutes: pick.etaMinutes,
          reason: `Nearest free unit with ${capability} capability (${pick.distanceKm} km), added so this need is not left uncovered`,
        };
        allocation.assignments.push(assignment);
        added.push(assignment);
      }
    }
    if (added.length > 0) {
      await log("orchestrator", `Coverage check added ${added.map((a) => `${codeOf(a.resourceId)} -> ${codeOf(a.incidentId)}`).join(", ")}.`, { added });
    }
  };

  // Escalation: any incident still missing a capability after allocation is listed as uncovered,
  // with the expected wait until the nearest busy unit could arrive (numbers from the tools).
  const escalate = async (allocation, active) => {
    const assigned = new Set(allocation.assignments.map((a) => a.resourceId));
    const busy = resources.filter((r) => ["reserved", "en_route", "on_scene"].includes(r.status) || assigned.has(String(r.id)));
    for (const { incident, onScene } of active) {
      const id = String(incident.id);
      const newUnits = allocation.assignments.filter((a) => a.incidentId === id).map((a) => unitInfo(a.resourceId)).filter(Boolean);
      const missing = missingCapabilities(incident, [...onScene, ...newUnits]);
      if (missing.length === 0) {
        // Fully covered now: drop any "uncovered" entry Gemini wrote for it.
        allocation.uncovered = allocation.uncovered.filter((u) => u.incidentId !== id || incident.requiredCapabilities.length === 0);
        continue;
      }
      const waits = missing.map((capability) => estimateWaitMinutes(incident, capability, busy));
      const delay = waits.includes(null) ? null : Math.max(...waits);
      const reason = `No free ${missing.join(" or ")} unit` +
        (delay === null ? "; none in the city can cover it right now" : `; the nearest busy one could arrive in about ${delay} min`);
      const entry = allocation.uncovered.find((u) => u.incidentId === id);
      if (entry) Object.assign(entry, { reason, expectedDelayMinutes: delay });
      else allocation.uncovered.push({ incidentId: id, reason, expectedDelayMinutes: delay });
      await log("orchestrator", `Escalation: ${incident.code} (severity ${incident.severity}): ${reason}.`,
        { incidentId: id, missing, expectedDelayMinutes: delay }, incident.id);
    }
  };

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
    await fillGaps(allocation, active);
    await escalate(allocation, active);

    // Only low-confidence, low-severity incidents with no units yet may be investigated (while rounds remain).
    // Severe incidents get units now; their follow-up questions are shown alongside the plan.
    const askable = new Set(round < MAX_INVESTIGATE_ROUNDS
      ? active.filter(({ incident, onScene }) => incident.severityConfidence === "low" && incident.severity <= 3 && onScene.length === 0)
        .map(({ incident }) => String(incident.id))
      : []);
    command = await commandPlan({ incidents: active.map((r) => r.incident), allocation, codeOf, previous, askable, event });
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
  // Reopened incidents whose remaining units still cover every need go back to dispatched.
  for (const incident of alreadyCovered) {
    incident.status = "dispatched";
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
