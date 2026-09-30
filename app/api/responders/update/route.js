// Owner: Sam
import { NextResponse } from "next/server";
import { connectDB, Incident, Resource } from "@/lib/db";

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
        await Incident.updateOne({ _id: assignedId }, { $pull: { assignedResources: resource._id } }, { session });
      }
      await resource.save({ session });
      result = {
        resource,
        replanNeeded,
        affectedIncidentIds: assignedId && ["unavailable", "cleared"].includes(body.event) ? [assignedId] : [],
      };
    });
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    if (error.code === "NOT_FOUND") return errorResponse("NOT_FOUND", error.message, 404);
    if (error.code === "INVALID_TRANSITION") return errorResponse("INVALID_TRANSITION", error.message, 409);
    return errorResponse("DATABASE_ERROR", "Could not update the responder; check the database connection and transaction support.", 500);
  } finally {
    await session?.endSession();
  }
}
