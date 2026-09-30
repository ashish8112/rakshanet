// Owner: Ashish
import { NextResponse } from "next/server";
import { generatePlan } from "@/lib/orchestrator/generatePlan";

const triggers = new Set(["new_incident", "resource_change", "responder_update", "manual", "edit"]);

function errorResponse(code, message, status) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Could not parse the plan request; check the JSON body.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !triggers.has(body.trigger) ||
      (body.incidentId != null && (typeof body.incidentId !== "string" || !/^[0-9a-fA-F]{24}$/.test(body.incidentId))) ||
      (body.resourceId != null && (typeof body.resourceId !== "string" || !/^[0-9a-fA-F]{24}$/.test(body.resourceId)))) {
    return errorResponse("INVALID_PLAN_REQUEST", "Could not generate a plan; check trigger, incidentId, and resourceId.", 400);
  }

  try {
    return NextResponse.json({ ok: true, data: await generatePlan(body) });
  } catch (error) {
    if (error.code === "INCIDENT_NOT_FOUND") {
      return errorResponse(error.code, error.message, 404);
    }
    if (error.message?.startsWith("Could not call Gemini") || error.message?.startsWith("Could not parse Gemini") || error.message?.startsWith("Could not use Gemini")) {
      return errorResponse("AGENT_ERROR", error.message, 502);
    }
    console.error("plan/generate failed:", error);
    return errorResponse("PLAN_GENERATION_ERROR", "Could not generate a plan; check the database connection and Gemini service.", 500);
  }
}
