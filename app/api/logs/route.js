// Owner: Ashish
// GET /api/logs?planVersion=3 -> AgentLog[] oldest first (all logs when planVersion is left out)
import { NextResponse } from "next/server";
import { getLogs } from "@/lib/orchestrator/planActions";
import { ok, fail } from "@/lib/orchestrator/respond";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get("planVersion");
  const planVersion = raw === null || raw === "" ? null : Number(raw);
  if (planVersion !== null && (!Number.isInteger(planVersion) || planVersion < 1)) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_PLAN_VERSION", message: "Could not load logs; planVersion must be a positive whole number." } }, { status: 400 });
  }
  try {
    return ok(await getLogs(planVersion));
  } catch (error) {
    return fail(error, "Could not load agent logs; check the database connection.");
  }
}
