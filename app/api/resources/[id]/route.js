// Owner: Ashish
// DELETE /api/resources/:id -> { removed: id }   Removes a unit for good (sold, written off, closed).
// Not allowed while the unit is on a job, or while a hospital/shelter still holds people.
import { NextResponse } from "next/server";
import { connectDB, Resource } from "@/lib/db";
import { actorFrom, logActivity, unitName } from "@/lib/activity";

const fail = (code, message, status) => NextResponse.json({ ok: false, error: { code, message } }, { status });

export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return fail("INVALID_ID", "Could not remove the unit; check its id.", 400);
  try {
    await connectDB();
    const resource = await Resource.findById(id);
    if (!resource) return fail("NOT_FOUND", "That unit no longer exists.", 404);
    if (resource.assignedIncident || ["reserved", "en_route", "on_scene"].includes(resource.status)) {
      return fail("UNIT_BUSY", `${unitName(resource)} is on a job. Wait until it reports Job done, then remove it.`, 409);
    }
    if (resource.capacity?.used > 0) {
      return fail("UNIT_BUSY", `${unitName(resource)} still has ${resource.capacity.used} people. It can be removed once it is empty.`, 409);
    }
    await resource.deleteOne();
    await logActivity({ type: "unit_removed", actor: await actorFrom(request), resourceId: resource.id, message: `${unitName(resource)} removed from the fleet` });
    return NextResponse.json({ ok: true, data: { removed: id } });
  } catch {
    return fail("DATABASE_ERROR", "Could not remove the unit; check the database connection.", 500);
  }
}

// PATCH /api/resources/:id { admitted?: n, discharged?: n, total?: n } -> the updated hospital/shelter
// The dispatcher records what a hospital or shelter reports by phone: people admitted or discharged,
// or a new number of beds/places. Used never goes below 0 or above the total.
export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return fail("INVALID_ID", "Could not update; check the id.", 400);
  let body;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_JSON", "Could not read the update.", 400);
  }
  const whole = (v) => v === undefined || (Number.isInteger(v) && v >= 0 && v <= 5000);
  if (!body || !whole(body.admitted) || !whole(body.discharged) || !whole(body.total) || (body.total !== undefined && body.total < 1) ||
      [body.admitted, body.discharged, body.total].every((v) => v === undefined)) {
    return fail("INVALID_CAPACITY", "Enter how many people were admitted or discharged, or the new number of beds.", 400);
  }
  try {
    await connectDB();
    const place = await Resource.findById(id);
    if (!place) return fail("NOT_FOUND", "That hospital or shelter no longer exists.", 404);
    if (!place.capacity) return fail("INVALID_CAPACITY", "Only hospitals and shelters have beds or places.", 400);

    const before = { used: place.capacity.used, total: place.capacity.total };
    const total = body.total ?? before.total;
    const used = before.used + (body.admitted ?? 0) - (body.discharged ?? 0);
    if (used < 0) return fail("INVALID_CAPACITY", `Only ${before.used} people are there, so ${body.discharged} cannot be discharged.`, 409);
    if (used > total) return fail("INVALID_CAPACITY", `That would be ${used} people for ${total} ${place.kind === "hospital" ? "beds" : "places"}. Increase the total first.`, 409);

    place.capacity = { total, used };
    await place.save();
    const unit = place.kind === "hospital" ? "beds" : "places";
    const parts = [
      body.admitted && `${body.admitted} admitted`,
      body.discharged && `${body.discharged} discharged`,
      body.total !== undefined && body.total !== before.total && `total ${unit} ${before.total} → ${total}`,
    ].filter(Boolean).join(", ");
    await logActivity({ type: "capacity_changed", actor: await actorFrom(request), resourceId: place.id,
      message: `${place.name.replace(" (demo)", "")}: ${parts || "no change"} (now ${total - used} of ${total} ${unit} free)` });
    return NextResponse.json({ ok: true, data: place });
  } catch {
    return fail("DATABASE_ERROR", "Could not update; check the database connection.", 500);
  }
}
