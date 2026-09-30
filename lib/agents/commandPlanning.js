// Command and Planning agent (Gemini): writes the plan for the dispatcher,
// or asks to investigate one vague incident first.
import { generateAgentJson } from "./gemini";
import { commandPlanningInstruction } from "./prompts/commandPlanning";

const isText = (value) => typeof value === "string" && value.trim().length > 0;
const isPairList = (list, a, b) => Array.isArray(list) && list.every((item) => isText(item?.[a]) && isText(item?.[b]));
const wordCount = (text) => text.trim().split(/\s+/).length;
const MAX_SUMMARY_WORDS = 55; // prompt asks for 45; a little slack before we ask again

// Plain words for incident types, used in labels like "building collapse in Indiranagar".
const TYPE_WORDS = { flood: "flood", fire: "fire", collapse: "building collapse", accident: "road accident", medical: "medical emergency", other: "incident" };

// incidents: assessed Incident docs in the plan; allocation: resourceAllocation output;
// codeOf: id -> code lookup; previous: last Plan doc or null; askable: incident ids allowed for "investigate";
// event: what triggered this replan, in plain words.
export async function commandPlan({ incidents, allocation, codeOf, previous, askable, event = null }) {
  const validate = (output) => {
    const shapeOk = output &&
      ["propose", "investigate"].includes(output.action) &&
      isText(output.summary) &&
      isPairList(output.alternatives, "summary", "tradeoff") &&
      isPairList(output.changes, "what", "why") &&
      (output.action === "propose" ||
        (askable.has(String(output.investigate?.incidentId)) && isText(output.investigate?.question)));
    if (!shapeOk) return false;
    if (wordCount(output.summary) > MAX_SUMMARY_WORDS) {
      return `the summary has ${wordCount(output.summary)} words; keep it to 2 sentences and at most 45 words`;
    }
    return true;
  };

  const labelOf = new Map(incidents.map((incident) => [String(incident.id), `${TYPE_WORDS[incident.type] ?? incident.type} in ${incident.location.area}`]));
  const input = {
    whatHappened: event,
    incidents: incidents.map((incident) => ({
      incidentId: String(incident.id),
      label: labelOf.get(String(incident.id)),
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
      incident: labelOf.get(String(a.incidentId)) ?? codeOf(a.incidentId),
      unit: codeOf(a.resourceId),
      destination: a.destinationId ? codeOf(a.destinationId) : null,
      distanceKm: a.distanceKm,
      etaMinutes: a.etaMinutes,
      reason: a.reason,
    })),
    uncovered: allocation.uncovered.map((u) => ({
      incident: labelOf.get(String(u.incidentId)) ?? codeOf(u.incidentId),
      reason: u.reason,
      expectedDelayMinutes: u.expectedDelayMinutes,
    })),
    previousPlan: previous
      ? {
          version: previous.version,
          summary: previous.summary,
          assignments: previous.assignments.map((a) => ({ incident: labelOf.get(String(a.incidentId)) ?? codeOf(a.incidentId), unit: codeOf(a.resourceId) })),
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
