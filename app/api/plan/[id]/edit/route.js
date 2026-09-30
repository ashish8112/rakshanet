// Owner: Ashish
// POST /api/plan/:id/edit  { assignments, note } -> new Plan version (status proposed, trigger edit)
import { editPlan } from "@/lib/orchestrator/planActions";
import { ok, fail, readBody, badJson } from "@/lib/orchestrator/respond";
import { actorFrom } from "@/lib/activity";

export async function POST(request, { params }) {
  const { id } = await params;
  let body;
  try {
    body = await readBody(request);
  } catch {
    return badJson();
  }
  try {
    return ok(await editPlan(id, body.assignments, body.note, await actorFrom(request)));
  } catch (error) {
    return fail(error, "Could not edit the plan; check the database connection.");
  }
}
