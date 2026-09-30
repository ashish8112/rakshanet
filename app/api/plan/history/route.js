// Owner: Ashish
// GET /api/plan/history -> Plan[] newest first
import { getPlanHistory } from "@/lib/orchestrator/planActions";
import { ok, fail } from "@/lib/orchestrator/respond";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await getPlanHistory());
  } catch (error) {
    return fail(error, "Could not load the plan history; check the database connection.");
  }
}
