// Owner: Ashish
// GET /api/plan/current -> latest proposed, approved or committed Plan, or null
import { getCurrentPlan } from "@/lib/orchestrator/planActions";
import { ok, fail } from "@/lib/orchestrator/respond";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await getCurrentPlan());
  } catch (error) {
    return fail(error, "Could not load the current plan; check the database connection.");
  }
}
