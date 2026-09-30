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
