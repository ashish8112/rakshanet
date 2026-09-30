// History entries for a freshly generated plan (used by both /api/plan/generate and /api/plan/stream).
import { logActivity } from "@/lib/activity";

export async function recordPlanActivity({ plan, logs }, askedBy) {
  const incidentIds = [...new Set([...plan.assignments, ...plan.uncovered].map((a) => String(a.incidentId)))];
  await logActivity({
    type: "plan_proposed",
    actor: plan.source === "backup" ? "Backup rules" : "AI",
    planVersion: plan.version,
    incidentIds,
    message: `Plan ${plan.version} proposed (asked by ${askedBy}): ${plan.summary}${plan.uncovered.length ? ` Short of help: ${plan.uncovered.length}.` : ""}`,
  });
  // Vague reports the AI set aside: record its question so History shows why nothing was sent yet.
  for (const log of logs) {
    const question = log.output?.investigate;
    if (log.agent === "orchestrator" && question?.incidentId) {
      await logActivity({ type: "incident_updated", actor: "AI", planVersion: plan.version, incidentIds: [question.incidentId], message: `AI needs more information before sending anyone: "${question.question}"` });
    }
  }
}
