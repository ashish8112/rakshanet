// Command and Planning agent (Gemini): writes the plan for the dispatcher,
// or asks to investigate one vague incident first.
import { generateAgentJson } from "./gemini";
import { commandPlanningInstruction } from "./prompts/commandPlanning";

const isText = (value) => typeof value === "string" && value.trim().length > 0;
const isPairList = (list, a, b) => Array.isArray(list) && list.every((item) => isText(item?.[a]) && isText(item?.[b]));

// incidents: assessed Incident docs in the plan; allocation: resourceAllocation output;
// codeOf: id -> code lookup; previous: last Plan doc or null; askable: incident ids allowed for "investigate".
export async function commandPlan({ incidents, allocation, codeOf, previous, askable }) {
  const validate = (output) =>
    output &&
    ["propose", "investigate"].includes(output.action) &&
    isText(output.summary) &&
    isPairList(output.alternatives, "summary", "tradeoff") &&
    isPairList(output.changes, "what", "why") &&
    (output.action === "propose" ||
      (askable.has(String(output.investigate?.incidentId)) && isText(output.investigate?.question)));

  const input = {
    incidents: incidents.map((incident) => ({
      incidentId: String(incident.id),
      code: incident.code,
      type: incident.type,
      area: incident.location.area,
      description: incident.description,
      severity: incident.severity,
      confidence: incident.severityConfidence,
      followUpQuestions: incident.followUpQuestions,
      canInvestigate: askable.has(String(incident.id)),
    })),
    assignments: allocation.assignments.map((a) => ({
      incident: codeOf(a.incidentId),
      unit: codeOf(a.resourceId),
      destination: a.destinationId ? codeOf(a.destinationId) : null,
      distanceKm: a.distanceKm,
      etaMinutes: a.etaMinutes,
      reason: a.reason,
    })),
    uncovered: allocation.uncovered.map((u) => ({ incident: codeOf(u.incidentId), reason: u.reason })),
    previousPlan: previous
      ? {
          version: previous.version,
          summary: previous.summary,
          assignments: previous.assignments.map((a) => ({ incident: codeOf(a.incidentId), unit: codeOf(a.resourceId) })),
        }
      : null,
  };

  const output = await generateAgentJson({
    systemInstruction: commandPlanningInstruction,
    prompt: JSON.stringify(input),
    validate,
  });

  return {
    action: output.action,
    summary: output.summary.trim(),
    alternatives: output.alternatives,
    changes: previous ? output.changes : [],
    investigate: output.action === "investigate"
      ? { incidentId: String(output.investigate.incidentId), question: output.investigate.question.trim() }
      : null,
  };
}
