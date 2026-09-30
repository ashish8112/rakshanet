// Owner: Ashish
// POST /api/plan/generate { trigger, incidentId?, resourceId?, mode? } -> { plan, logs }
// (the screen uses /api/plan/stream to watch the steps live; this one returns everything at the end)
import { NextResponse } from "next/server";
import { generatePlan } from "@/lib/orchestrator/generatePlan";
import { recordPlanActivity } from "@/lib/orchestrator/planActivity";
import { planFailure, planRequestProblem } from "@/lib/orchestrator/planRequest";
import { actorFrom } from "@/lib/activity";

const errorResponse = (code, message, status) => NextResponse.json({ ok: false, error: { code, message } }, { status });

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Could not parse the plan request; check the JSON body.", 400);
  }
  const problem = planRequestProblem(body);
  if (problem) return errorResponse("INVALID_PLAN_REQUEST", problem, 400);

  try {
    const result = await generatePlan(body);
    await recordPlanActivity(result, await actorFrom(request));
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const failure = planFailure(error);
    return errorResponse(failure.code, failure.message, failure.status);
  }
}
