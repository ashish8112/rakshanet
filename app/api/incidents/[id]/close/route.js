// Owner: Ashish
// POST /api/incidents/:id/close { outcome: "resolved" | "cancelled", note? } -> the closed Incident
// "resolved": the job is done. "cancelled": the report was added by mistake (kept for the record, not deleted).
// Every vehicle still on the emergency is released and becomes free again (out-of-service vehicles stay out of service).
import { NextResponse } from "next/server";
import { connectDB, Incident, Resource } from "@/lib/db";
import { actorFrom, incidentName, logActivity, unitName } from "@/lib/activity";

const fail = (code, message, status) => NextResponse.json({ ok: false, error: { code, message } }, { status });

export async function POST(request, { params }) {
  const { id } = await params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return fail("INVALID_ID", "Could not close the emergency; check its id.", 400);
  let body;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_JSON", "Could not read the request.", 400);
  }
  if (!["resolved", "cancelled"].includes(body?.outcome)) return fail("INVALID_OUTCOME", "Choose resolved or cancelled.", 400);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : "";

  try {
    await connectDB();
    const incident = await Incident.findById(id);
    if (!incident) return fail("NOT_FOUND", "That emergency no longer exists.", 404);
    if (["resolved", "cancelled"].includes(incident.status)) return fail("ALREADY_CLOSED", `This emergency is already ${incident.status}.`, 409);

    const units = await Resource.find({ assignedIncident: incident._id });
    for (const unit of units) {
      unit.assignedIncident = null;
      if (unit.status !== "unavailable") unit.status = "available";
      await unit.save();
    }
    incident.status = body.outcome;
    incident.assignedResources = [];
    await incident.save();

    const actor = await actorFrom(request);
    const freed = units.length ? ` ${units.map(unitName).join(", ")} ${units.length === 1 ? "is" : "are"} free again.` : "";
    await logActivity({
      type: body.outcome === "resolved" ? "incident_resolved" : "incident_cancelled",
      actor,
      incidentIds: [incident.id],
      message: body.outcome === "resolved"
        ? `${incidentName(incident)} marked resolved by hand${note ? ` (${note})` : ""}.${freed}`
        : `${incidentName(incident)} cancelled: reported by mistake${note ? ` (${note})` : ""}.${freed}`,
    });
    return NextResponse.json({ ok: true, data: incident });
  } catch {
    return fail("DATABASE_ERROR", "Could not close the emergency; check the database connection.", 500);
  }
}
