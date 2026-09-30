// Checks the body of a plan request (shared by /api/plan/generate and /api/plan/stream).
const TRIGGERS = new Set(["new_incident", "resource_change", "responder_update", "manual", "edit"]);
const isId = (value) => typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);

export function planRequestProblem(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || !TRIGGERS.has(body.trigger) ||
      (body.incidentId != null && !isId(body.incidentId)) ||
      (body.resourceId != null && !isId(body.resourceId)) ||
      (body.mode != null && body.mode !== "backup")) {
    return "Could not generate a plan; check trigger, incidentId, and resourceId.";
  }
  return null;
}

// A planning error as { status, code, message } for the API envelope.
export function planFailure(error) {
  if (error.code === "INCIDENT_NOT_FOUND") return { status: 404, code: error.code, message: error.message };
  console.error("plan generation failed:", error.cause?.message ?? error);
  return { status: 500, code: "PLAN_GENERATION_ERROR", message: "Could not generate a plan; check the database connection." };
}
