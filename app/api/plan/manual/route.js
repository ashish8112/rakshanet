// Owner: Ashish
// POST /api/plan/manual { incidentId, resourceIds: [...], destinationId?, note? } -> Plan (status approved, source manual)
// Manual mode: the dispatcher chooses the vehicles without the AI. The screen then calls POST /api/dispatch.
import { createManualPlan } from "@/lib/orchestrator/planActions";
import { ok, fail, readBody, badJson } from "@/lib/orchestrator/respond";
import { actorFrom } from "@/lib/activity";

export async function POST(request) {
  let body;
  try {
    body = await readBody(request);
  } catch {
    return badJson();
  }
  try {
    return ok(await createManualPlan(body, await actorFrom(request)));
  } catch (error) {
    return fail(error, "Could not make the manual plan; check the database connection.");
  }
}
