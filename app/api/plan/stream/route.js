// Owner: Ashish
// POST /api/plan/stream { trigger, incidentId?, resourceId?, mode? }
// Streams the planning live as newline-delimited JSON, one object per line:
//   { "type": "step", "kind": "status" | "step" | "tool", "agent": "...", "message": "...", "at": "..." }   (many)
//   { "type": "done", "ok": true, "data": { plan, logs } }   or   { "type": "done", "ok": false, "error": { code, message } }   (last)
import { generatePlan } from "@/lib/orchestrator/generatePlan";
import { recordPlanActivity } from "@/lib/orchestrator/planActivity";
import { planFailure, planRequestProblem } from "@/lib/orchestrator/planRequest";
import { actorFrom } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let body = null;
  try {
    body = await request.json();
  } catch {
    // reported below as an invalid request
  }
  const problem = body ? planRequestProblem(body) : "Could not parse the plan request; check the JSON body.";
  const askedBy = await actorFrom(request);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (object) => controller.enqueue(encoder.encode(`${JSON.stringify(object)}\n`));
      if (problem) {
        send({ type: "done", ok: false, error: { code: "INVALID_PLAN_REQUEST", message: problem } });
        return controller.close();
      }
      try {
        const result = await generatePlan(body, { onStep: (step) => send({ type: "step", ...step }) });
        await recordPlanActivity(result, askedBy);
        send({ type: "done", ok: true, data: result });
      } catch (error) {
        const failure = planFailure(error);
        send({ type: "done", ok: false, error: { code: failure.code, message: failure.message } });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
}
