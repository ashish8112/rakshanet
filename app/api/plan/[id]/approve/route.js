// Owner: Ashish
// POST /api/plan/:id/approve  { note? } -> Plan (status approved)
// The frontend calls POST /api/dispatch next (Sam) to actually send the units.
import { approvePlan } from "@/lib/orchestrator/planActions";
import { ok, fail, readBody, badJson } from "@/lib/orchestrator/respond";

export async function POST(request, { params }) {
  const { id } = await params;
  let body;
  try {
    body = await readBody(request);
  } catch {
    return badJson();
  }
  try {
    return ok(await approvePlan(id, body.note));
  } catch (error) {
    return fail(error, "Could not approve the plan; check the database connection.");
  }
}
