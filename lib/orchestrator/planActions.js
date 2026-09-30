// Dispatcher decisions on a plan: approve, reject, edit. Plus lookups for current plan, history, logs.
import { connectDB, Incident, Resource, Plan, AgentLog } from "@/lib/db";
import { distanceKm, etaMinutes, validateAssignments } from "@/lib/tools";
import { logActivity, incidentName, unitName } from "@/lib/activity";

const isId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value ?? ""));

// Error with an API code and HTTP status; routes turn it into the error envelope.
export function planError(code, message, status, extra = {}) {
  return Object.assign(new Error(message), { code, status, extra });
}

async function loadPlan(id, allowed, action) {
  if (!isId(id)) throw planError("INVALID_ID", `Could not ${action} the plan; check its id.`, 400);
  await connectDB();
  const plan = await Plan.findById(id);
  if (!plan) throw planError("NOT_FOUND", `Could not ${action} the plan; no plan has that id.`, 404);
  if (!allowed.includes(plan.status)) {
    throw planError("INVALID_STATUS", `Could not ${action} plan v${plan.version}; it is already ${plan.status}.`, 409);
  }
  return plan;
}

function cleanNote(note) {
  return typeof note === "string" ? note.trim() : "";
}

export async function getCurrentPlan() {
  await connectDB();
  return Plan.findOne({ status: { $in: ["proposed", "approved", "committed"] } }).sort({ version: -1 });
}

export async function getPlanHistory() {
  await connectDB();
  return Plan.find().sort({ version: -1 });
}

export async function getLogs(planVersion) {
  await connectDB();
  const filter = planVersion === null ? {} : { planVersion };
  return AgentLog.find(filter).sort({ createdAt: 1, _id: 1 });
}

const planIncidentIds = (plan) => [...new Set([...plan.assignments, ...plan.uncovered].map((a) => String(a.incidentId)))];

export async function approvePlan(id, note, actor = "Dispatcher") {
  const plan = await loadPlan(id, ["proposed"], "approve");
  plan.status = "approved";
  plan.dispatcherNote = cleanNote(note);
  plan.decidedAt = new Date();
  await plan.save();
  await AgentLog.create({ planVersion: plan.version, agent: "orchestrator",
    message: `Dispatcher approved plan v${plan.version}${plan.dispatcherNote ? `: "${plan.dispatcherNote}"` : ""}.`, output: { planId: plan.id } });
  await logActivity({ type: "plan_approved", actor, planVersion: plan.version, incidentIds: planIncidentIds(plan), message: `Plan ${plan.version} approved${plan.dispatcherNote ? ` (${plan.dispatcherNote})` : ""}` });
  return plan;
}

export async function rejectPlan(id, note, actor = "Dispatcher") {
  const plan = await loadPlan(id, ["proposed"], "reject");
  plan.status = "rejected";
  plan.dispatcherNote = cleanNote(note);
  plan.decidedAt = new Date();
  await plan.save();
  await AgentLog.create({ planVersion: plan.version, agent: "orchestrator",
    message: `Dispatcher rejected plan v${plan.version}${plan.dispatcherNote ? `: "${plan.dispatcherNote}"` : ""}.`, output: { planId: plan.id } });
  await logActivity({ type: "plan_rejected", actor, planVersion: plan.version, incidentIds: planIncidentIds(plan), message: `Plan ${plan.version} rejected${plan.dispatcherNote ? `: ${plan.dispatcherNote}` : ""}` });
  return plan;
}

// The dispatcher changes assignments by hand. We re-check them against the live database,
// recompute distance and ETA with the tools, and save them as a NEW proposed version.
export async function editPlan(id, assignments, note, actor = "Dispatcher") {
  const original = await loadPlan(id, ["proposed", "approved"], "edit");
  if (!Array.isArray(assignments) || assignments.some((a) => !isId(a?.incidentId) || !isId(a?.resourceId) || (a.destinationId != null && !isId(a.destinationId)))) {
    throw planError("INVALID_ASSIGNMENTS", "Could not edit the plan; each assignment needs a valid incidentId and resourceId.", 400);
  }

  const check = await validateAssignments(assignments);
  if (!check.valid) {
    throw planError("INVALID_ASSIGNMENTS", `Could not edit the plan; ${check.conflicts.map((c) => c.reason).join("; ")}.`, 409, { conflicts: check.conflicts });
  }

  const [resources, incidents] = await Promise.all([Resource.find(), Incident.find()]);
  const resourceById = new Map(resources.map((r) => [String(r.id), r]));
  const incidentById = new Map(incidents.map((i) => [String(i.id), i]));
  const codeOf = (x) => resourceById.get(String(x))?.code ?? incidentById.get(String(x))?.code ?? String(x);

  const newAssignments = assignments.map((a) => {
    const resource = resourceById.get(String(a.resourceId));
    const incident = incidentById.get(String(a.incidentId));
    return {
      incidentId: String(a.incidentId),
      resourceId: String(a.resourceId),
      destinationId: a.destinationId ? String(a.destinationId) : null,
      distanceKm: distanceKm(resource.location, incident.location),
      etaMinutes: etaMinutes(resource.location, incident.location, resource.kind),
      reason: typeof a.reason === "string" && a.reason.trim() ? a.reason.trim() : "Chosen by the dispatcher",
    };
  });

  // What changed, unit by unit.
  const pairs = (list) => new Map(list.map((a) => [String(a.resourceId), String(a.incidentId)]));
  const before = pairs(original.assignments);
  const after = pairs(newAssignments);
  const why = cleanNote(note) || "Dispatcher edit";
  const changes = [];
  for (const [unit, incident] of after) {
    if (before.get(unit) !== incident) {
      changes.push({ what: before.has(unit) ? `${codeOf(unit)} moved from ${codeOf(before.get(unit))} to ${codeOf(incident)}` : `${codeOf(unit)} added to ${codeOf(incident)}`, why });
    }
  }
  for (const [unit, incident] of before) {
    if (!after.has(unit)) changes.push({ what: `${codeOf(unit)} removed from ${codeOf(incident)}`, why });
  }

  // Incidents in the old plan that now have no unit are listed as uncovered.
  const covered = new Set(newAssignments.map((a) => a.incidentId));
  const planIncidents = new Set([...original.assignments.map((a) => String(a.incidentId)), ...original.uncovered.map((u) => String(u.incidentId))]);
  const uncovered = [...planIncidents].filter((incidentId) => !covered.has(incidentId)).map((incidentId) =>
    original.uncovered.find((u) => String(u.incidentId) === incidentId)?.toObject?.() ??
    { incidentId, reason: "No unit after the dispatcher's edit", expectedDelayMinutes: null });

  const latest = await Plan.findOne().sort({ version: -1 });
  const version = latest.version + 1;
  original.status = "superseded";
  await original.save();
  const plan = await Plan.create({
    version,
    status: "proposed",
    trigger: "edit",
    summary: `Dispatcher edited plan v${original.version}: ${changes.length} change${changes.length === 1 ? "" : "s"}. ${newAssignments.length} unit${newAssignments.length === 1 ? "" : "s"} assigned.`,
    assignments: newAssignments,
    uncovered,
    alternatives: [],
    changes,
    dispatcherNote: cleanNote(note),
  });
  await AgentLog.create({ planVersion: version, agent: "orchestrator",
    message: `Dispatcher edited plan v${original.version} into v${version}: ${changes.map((c) => c.what).join("; ") || "no unit changes"}.`,
    output: { planId: plan.id, fromPlanId: original.id, changes } });
  await logActivity({ type: "plan_edited", actor, planVersion: version, incidentIds: planIncidentIds(plan), message: `Plan ${original.version} edited by hand into plan ${version}: ${changes.map((c) => c.what).join("; ") || "no unit changes"}` });
  return plan;
}

// Manual mode (no AI): the dispatcher picks the vehicles for one emergency. Same safety check as always
// (validateAssignments against the live database); distance and ETA from the tools. Saved as an approved
// plan with source "manual", ready for POST /api/dispatch.
export async function createManualPlan({ incidentId, resourceIds, destinationId, note }, actor = "Dispatcher") {
  if (!isId(incidentId)) throw planError("INVALID_INCIDENT", "Choose the emergency to send vehicles to.", 400);
  if (!Array.isArray(resourceIds) || resourceIds.length === 0 || resourceIds.some((id) => !isId(id))) {
    throw planError("INVALID_ASSIGNMENTS", "Choose at least one vehicle to send.", 400);
  }
  if (destinationId != null && !isId(destinationId)) throw planError("INVALID_ASSIGNMENTS", "That hospital or shelter is not valid.", 400);
  await connectDB();
  const incident = await Incident.findById(incidentId);
  if (!incident) throw planError("NOT_FOUND", "That emergency no longer exists.", 404);

  const unique = [...new Set(resourceIds.map(String))];
  const draft = unique.map((resourceId) => ({ incidentId: String(incidentId), resourceId, destinationId: destinationId ?? null }));
  const check = await validateAssignments(draft);
  if (!check.valid) {
    throw planError("INVALID_ASSIGNMENTS", `Could not send: ${[...new Set(check.conflicts.map((c) => c.reason))].join("; ")}.`, 409, { conflicts: check.conflicts });
  }

  const units = await Resource.find({ _id: { $in: unique } });
  const byId = new Map(units.map((u) => [String(u.id), u]));
  const assignments = unique.map((resourceId) => {
    const unit = byId.get(resourceId);
    return {
      incidentId: String(incidentId),
      resourceId,
      destinationId: destinationId ?? null,
      distanceKm: distanceKm(unit.location, incident.location),
      etaMinutes: etaMinutes(unit.location, incident.location, unit.kind),
      reason: "Chosen by the dispatcher (manual mode)",
    };
  });

  const latest = await Plan.findOne().sort({ version: -1 });
  const version = (latest?.version ?? 0) + 1;
  // A waiting AI proposal may use the same vehicles: it is replaced by this manual decision.
  await Plan.updateMany({ status: "proposed" }, { $set: { status: "superseded" } });
  const names = units.map(unitName).join(", ");
  const plan = await Plan.create({
    version,
    status: "approved",
    trigger: "manual",
    source: "manual",
    summary: `Manual dispatch by ${actor}: ${names} to ${incidentName(incident)}.`,
    assignments,
    uncovered: [],
    alternatives: [],
    changes: [],
    dispatcherNote: typeof note === "string" ? note.trim() : "",
    decidedAt: new Date(),
  });
  await AgentLog.create({ planVersion: version, incidentId: incident.id, agent: "orchestrator", message: `Manual plan v${version} made by ${actor} (no AI): ${names}.`, output: { planId: plan.id, manual: true } });
  await logActivity({ type: "manual_plan", actor, planVersion: version, incidentIds: [incident.id], message: `Manual plan ${version}: ${names} chosen for ${incidentName(incident)}` });
  return plan;
}
