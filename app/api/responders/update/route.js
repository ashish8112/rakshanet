// Owner: Sam
import { NextResponse } from "next/server";
import { connectDB, Incident, Resource } from "@/lib/db";
import { actorFrom, incidentName, logActivity, unitName } from "@/lib/activity";

const EVENTS = new Set(["arrived", "unavailable", "available", "cleared"]);
const MOBILE_KINDS = new Set(["ambulance", "fire_unit", "rescue_team"]);

function errorResponse(code, message, status) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Could not parse the responder update; check the JSON body.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      typeof body.resourceId !== "string" || !/^[0-9a-fA-F]{24}$/.test(body.resourceId) || !EVENTS.has(body.event)) {
    return errorResponse("INVALID_RESPONDER_UPDATE", "Could not update the responder; check resourceId and event.", 400);
  }

  let session;
  let loggedIncidentId = null; // for the History entry
  let resolvedIncident = false;
  try {
    const db = await connectDB();
    session = await db.startSession();
    let result;
    await session.withTransaction(async () => {
      const resource = await Resource.findById(body.resourceId).session(session);
      if (!resource) {
        const error = new Error("Could not update the responder; no resource has that id.");
        error.code = "NOT_FOUND";
        throw error;
      }
      if (!MOBILE_KINDS.has(resource.kind)) {
        const error = new Error("Could not update the responder; only mobile units accept responder events.");
        error.code = "INVALID_TRANSITION";
        throw error;
      }

      const assignedId = resource.assignedIncident ? String(resource.assignedIncident) : null;
      loggedIncidentId = assignedId;
      let replanNeeded = false;
      if (body.event === "arrived") {
        if (!assignedId || !["reserved", "en_route"].includes(resource.status)) {
          const error = new Error("Could not mark the responder arrived; check that it is assigned and en route.");
          error.code = "INVALID_TRANSITION";
          throw error;
        }
        resource.status = "on_scene";
      } else if (body.event === "unavailable") {
        resource.status = "unavailable";
        resource.assignedIncident = null;
        replanNeeded = Boolean(assignedId);
      } else if (body.event === "available") {
        if (assignedId || !["unavailable", "available"].includes(resource.status)) {
          const error = new Error("Could not mark the responder available; clear its assignment first.");
          error.code = "INVALID_TRANSITION";
          throw error;
        }
        replanNeeded = resource.status === "unavailable";
        resource.status = "available";
      } else {
        if (!assignedId || !["reserved", "en_route", "on_scene"].includes(resource.status)) {
          const error = new Error("Could not clear the responder; check that it has an active assignment.");
          error.code = "INVALID_TRANSITION";
          throw error;
        }
        resource.status = "available";
        resource.assignedIncident = null;
        replanNeeded = true;
      }

      if (assignedId && ["unavailable", "cleared"].includes(body.event)) {
        const incident = await Incident.findById(assignedId).session(session);
        if (!incident) {
          const error = new Error("Could not update the responder; its assigned incident is missing.");
          error.code = "INVALID_TRANSITION";
          throw error;
        }
        incident.assignedResources = incident.assignedResources.filter(
          (id) => String(id) !== String(resource._id)
        );
        if (body.event === "unavailable" && incident.status === "dispatched") {
          incident.status = "planned";
        } else if (body.event === "cleared" && incident.assignedResources.length === 0) {
          incident.status = "resolved";
          resolvedIncident = true;
        }
        await incident.save({ session });
      }
      await resource.save({ session });
      result = {
        resource,
        replanNeeded,
        affectedIncidentIds: assignedId && ["unavailable", "cleared"].includes(body.event) ? [assignedId] : [],
      };
    });
    const incident = loggedIncidentId ? await Incident.findById(loggedIncidentId) : null;
    const who = unitName(result.resource);
    const where = incident ? incidentName(incident) : null;
    const message = {
      arrived: `${who} arrived at ${where}`,
      unavailable: `${who} is out of service${where ? ` (was on its way to ${where}); a replacement is needed` : ""}`,
      available: `${who} is back in service`,
      cleared: `${who} finished the job at ${where}`,
    }[body.event];
    const actor = await actorFrom(request);
    await logActivity({ type: `crew_${body.event}`, actor, incidentIds: [loggedIncidentId], resourceId: result.resource.id, message });
    if (resolvedIncident) {
      await logActivity({ type: "incident_resolved", actor, incidentIds: [loggedIncidentId], message: `${where} resolved: every unit has finished` });
    }
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    if (error.code === "NOT_FOUND") return errorResponse("NOT_FOUND", error.message, 404);
    if (error.code === "INVALID_TRANSITION") return errorResponse("INVALID_TRANSITION", error.message, 409);
    return errorResponse("DATABASE_ERROR", "Could not update the responder; check the database connection and transaction support.", 500);
  } finally {
    await session?.endSession();
  }
}
