// Owner: Sam
import { NextResponse } from "next/server";
import { connectDB, Incident, Plan, Resource } from "@/lib/db";
import { validateAssignments } from "@/lib/tools";
import { actorFrom, logActivity, unitName } from "@/lib/activity";

const MOBILE_KINDS = new Set(["ambulance", "fire_unit", "rescue_team"]);
const DESTINATION_KINDS = new Set(["hospital", "shelter"]);

class DispatchConflict extends Error {
  constructor(conflicts) {
    super("Dispatch assignments changed before they could be committed.");
    this.conflicts = conflicts;
  }
}

function errorResponse(code, message, status) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function conflictResponse(conflicts) {
  return NextResponse.json({ ok: true, data: { committed: false, conflicts, replanNeeded: true } });
}

function checkLatestAssignments(assignments, resources, incidents, destinations) {
  const resourceById = new Map(resources.map((resource) => [String(resource.id), resource]));
  const incidentById = new Map(incidents.map((incident) => [String(incident.id), incident]));
  const destinationById = new Map(destinations.map((destination) => [String(destination.id), destination]));
  const destinationCounts = new Map();
  const conflicts = [];

  for (const assignment of assignments) {
    if (assignment.destinationId) {
      const id = String(assignment.destinationId);
      destinationCounts.set(id, (destinationCounts.get(id) ?? 0) + 1);
    }
  }
  for (const assignment of assignments) {
    const resourceId = String(assignment.resourceId);
    const resource = resourceById.get(resourceId);
    const incident = incidentById.get(String(assignment.incidentId));
    if (!resource || resource.status !== "available" || resource.assignedIncident || !MOBILE_KINDS.has(resource.kind)) {
      conflicts.push({ resourceId, reason: "Resource is missing or no longer available" });
    }
    if (!incident || ["dispatched", "resolved", "cancelled"].includes(incident.status)) {
      conflicts.push({ resourceId, reason: "Incident is missing or already dispatched or resolved" });
    } else if (resource && incident.requiredCapabilities.length > 0 &&
        !incident.requiredCapabilities.some((capability) => resource.capabilities.includes(capability))) {
      conflicts.push({ resourceId, reason: "Resource lacks a capability required by the incident" });
    }
    if (assignment.destinationId) {
      const destinationId = String(assignment.destinationId);
      const destination = destinationById.get(destinationId);
      const free = destination?.capacity ? destination.capacity.total - destination.capacity.used : 0;
      if (!destination || !DESTINATION_KINDS.has(destination.kind) || destination.status !== "available" ||
          free < destinationCounts.get(destinationId)) {
        conflicts.push({ resourceId, reason: "Destination is missing, unavailable, or lacks capacity" });
      }
    }
  }
  return conflicts;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Could not parse the dispatch request; check the JSON body.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      typeof body.planId !== "string" || !/^[0-9a-fA-F]{24}$/.test(body.planId)) {
    return errorResponse("INVALID_PLAN_ID", "Could not dispatch the plan; check planId.", 400);
  }

  try {
    const db = await connectDB();
    const plan = await Plan.findById(body.planId);
    if (!plan) return errorResponse("NOT_FOUND", "Could not dispatch the plan; no plan has that id.", 404);
    if (plan.status !== "approved") {
      return errorResponse("PLAN_NOT_APPROVED", "Could not dispatch the plan; approve it first.", 409);
    }
    if (plan.assignments.length === 0) {
      return errorResponse("EMPTY_PLAN", "Could not dispatch the plan; it has no resource assignments.", 409);
    }

    const validation = await validateAssignments(plan.assignments);
    if (!validation.valid) return conflictResponse(validation.conflicts);

    let committedPlan;
    await db.connection.transaction(async (session) => {
      const currentPlan = await Plan.findById(body.planId).session(session);
      if (!currentPlan || currentPlan.status !== "approved") {
        throw new DispatchConflict([{ resourceId: String(plan.assignments[0].resourceId), reason: "Plan is no longer approved" }]);
      }
      const assignments = currentPlan.assignments;
      const resourceIds = assignments.map((assignment) => assignment.resourceId);
      const incidentIds = assignments.map((assignment) => assignment.incidentId);
      const destinationIds = assignments.filter((assignment) => assignment.destinationId).map((assignment) => assignment.destinationId);
      const resources = await Resource.find({ _id: { $in: resourceIds } }).session(session);
      const incidents = await Incident.find({ _id: { $in: incidentIds } }).session(session);
      const destinations = await Resource.find({ _id: { $in: destinationIds } }).session(session);
      const conflicts = checkLatestAssignments(assignments, resources, incidents, destinations);
      if (conflicts.length > 0) throw new DispatchConflict(conflicts);

      const incidentResources = new Map();
      for (const assignment of assignments) {
        const incidentId = String(assignment.incidentId);
        const resourceId = String(assignment.resourceId);
        const update = await Resource.updateOne(
          { _id: assignment.resourceId, status: "available", assignedIncident: null },
          { $set: { status: "reserved", assignedIncident: assignment.incidentId } },
          { session }
        );
        if (update.modifiedCount !== 1) {
          throw new DispatchConflict([{ resourceId, reason: "Resource became unavailable during dispatch" }]);
        }
        const ids = incidentResources.get(incidentId) ?? [];
        ids.push(assignment.resourceId);
        incidentResources.set(incidentId, ids);
      }
      for (const [incidentId, ids] of incidentResources) {
        const update = await Incident.updateOne(
          { _id: incidentId, status: { $nin: ["dispatched", "resolved", "cancelled"] } },
          { $set: { status: "dispatched" }, $addToSet: { assignedResources: { $each: ids } } },
          { session }
        );
        if (update.modifiedCount !== 1) {
          throw new DispatchConflict([{ resourceId: String(ids[0]), reason: "Incident became unavailable during dispatch" }]);
        }
      }
      const destinationById = new Map(destinations.map((destination) => [String(destination.id), destination]));
      const destinationCounts = new Map();
      for (const assignment of assignments) {
        if (assignment.destinationId) {
          const id = String(assignment.destinationId);
          destinationCounts.set(id, (destinationCounts.get(id) ?? 0) + 1);
        }
      }
      for (const [destinationId, count] of destinationCounts) {
        const destination = destinationById.get(destinationId);
        const update = await Resource.updateOne(
          {
            _id: destinationId,
            status: "available",
            kind: { $in: ["hospital", "shelter"] },
            "capacity.total": destination.capacity.total,
            "capacity.used": destination.capacity.used,
          },
          { $inc: { "capacity.used": count } },
          { session }
        );
        if (update.modifiedCount !== 1) {
          const assignment = assignments.find((item) => String(item.destinationId) === destinationId);
          throw new DispatchConflict([{ resourceId: String(assignment.resourceId), reason: "Destination capacity changed during dispatch" }]);
        }
      }
      const update = await Plan.updateOne(
        { _id: body.planId, status: "approved" },
        { $set: { status: "committed" } },
        { session }
      );
      if (update.modifiedCount !== 1) {
        throw new DispatchConflict([{ resourceId: String(assignments[0].resourceId), reason: "Plan is no longer approved" }]);
      }
      committedPlan = await Plan.findById(body.planId).session(session);
    });
    const sentUnits = await Resource.find({ _id: { $in: committedPlan.assignments.map((a) => a.resourceId) } });
    await logActivity({
      type: "units_sent",
      actor: await actorFrom(request),
      planVersion: committedPlan.version,
      incidentIds: [...new Set(committedPlan.assignments.map((a) => String(a.incidentId)))],
      message: `Plan ${committedPlan.version} sent: ${sentUnits.map(unitName).join(", ")} on their way`,
    });
    return NextResponse.json({ ok: true, data: { committed: true, plan: committedPlan } });
  } catch (error) {
    if (error instanceof DispatchConflict) {
      await logActivity({ type: "dispatch_conflict", actor: await actorFrom(request), message: `Sending was stopped: ${error.conflicts.map((c) => c.reason).join("; ")}. A fresh plan is needed.` });
      return conflictResponse(error.conflicts);
    }
    return errorResponse("DISPATCH_ERROR", "Could not dispatch the plan; check the database connection and transaction support.", 500);
  }
}
