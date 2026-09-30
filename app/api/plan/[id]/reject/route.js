// Owner: Ashish
// POST /api/plan/:id/reject  { note } -> Plan (status rejected)
import { rejectPlan } from "@/lib/orchestrator/planActions";
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
    return ok(await rejectPlan(id, body.note));
  } catch (error) {
    return fail(error, "Could not reject the plan; check the database connection.");
  }
}
