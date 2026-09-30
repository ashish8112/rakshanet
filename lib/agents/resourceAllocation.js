// Resource Allocation agent (Gemini): decides which unit goes to which incident.
// Gemini only chooses ids and writes reasons; distance and ETA are copied from the tools.
import { generateAgentJson } from "./gemini";
import { resourceAllocationInstruction } from "./prompts/resourceAllocation";

const isText = (value) => typeof value === "string" && value.trim().length > 0;

// `routed`: [{ incident, details: { candidates, destinationOptions }, onScene, previousUnits }], most severe first.
export async function allocateResources(routed) {
  const byIncident = new Map(routed.map((entry) => [String(entry.incident.id), entry]));

  // Only the basic shape is checked here; bad individual assignments are repaired below.
  const validate = (output) => {
    if (!output || !Array.isArray(output.assignments) || !Array.isArray(output.uncovered)) {
      return "it must be an object with \"assignments\" and \"uncovered\" arrays";
    }
    if (output.assignments.some((a) => !a || typeof a.incidentId !== "string" || typeof a.resourceId !== "string")) {
      return "every assignment needs incidentId and resourceId strings";
    }
    return true;
  };

  const prompt = JSON.stringify(
    routed.map(({ incident, details, onScene = [], previousUnits = [] }) => ({
      incidentId: String(incident.id),
      code: incident.code,
      type: incident.type,
      area: incident.location.area,
      severity: incident.severity,
      confidence: incident.severityConfidence,
      requiredCapabilities: incident.requiredCapabilities,
      peopleAffected: incident.peopleAffected,
      alreadyOnScene: onScene.map(({ code, kind, capabilities }) => ({ code, kind, capabilities })),
      previousPlanUnits: previousUnits,
      candidates: details.candidates.map(({ resourceId, code, kind, capabilities, distanceKm, etaMinutes }) =>
        ({ resourceId, code, kind, capabilities, distanceKm, etaMinutes })),
      destinationOptions: details.destinationOptions.map(({ resourceId, code, kind, distanceKm, free }) =>
        ({ resourceId, code, kind, distanceKm, free })),
    }))
  );

  const raw = await generateAgentJson({
    systemInstruction: resourceAllocationInstruction,
    prompt: `Incidents to allocate (most severe first):\n${prompt}`,
    validate,
  });

  // Rebuild in the exact Plan.assignments shape, numbers from the tools.
  // Repairs instead of failing: a unit used twice, an id that is not a candidate, or an unknown
  // destination is dropped and recorded in `dropped` (the orchestrator's escalation reports any gap).
  const assignments = [];
  const dropped = [];
  const used = new Set();
  for (const a of raw.assignments) {
    const entry = byIncident.get(String(a.incidentId));
    const candidate = entry?.details.candidates.find((c) => c.resourceId === String(a.resourceId));
    if (!candidate) { dropped.push({ ...a, why: "not a candidate for this incident" }); continue; }
    if (used.has(candidate.resourceId)) { dropped.push({ ...a, why: "unit already assigned to a more severe incident" }); continue; }
    used.add(candidate.resourceId);
    const destination = entry.details.destinationOptions.find((d) => d.resourceId === String(a.destinationId));
    assignments.push({
      incidentId: String(a.incidentId),
      resourceId: candidate.resourceId,
      destinationId: destination ? destination.resourceId : null,
      distanceKm: candidate.distanceKm,
      etaMinutes: candidate.etaMinutes,
      reason: isText(a.reason) ? a.reason.trim() : `Nearest free ${candidate.kind.replace("_", " ")} (${candidate.distanceKm} km)`,
    });
  }

  // Safety net: an incident that got no unit and was not listed as uncovered is added here.
  const covered = new Set(assignments.map((a) => a.incidentId));
  const uncovered = raw.uncovered
    .filter((u) => byIncident.has(String(u?.incidentId)))
    .map((u) => ({
      incidentId: String(u.incidentId),
      reason: isText(u.reason) ? u.reason.trim() : "No unit assigned",
      expectedDelayMinutes: null, // filled in by the orchestrator's escalation step
    }));
  for (const { incident, details } of routed) {
    const id = String(incident.id);
    if (!covered.has(id) && !uncovered.some((u) => u.incidentId === id)) {
      uncovered.push({
        incidentId: id,
        reason: details.candidates.length === 0 ? "No free unit with the required capability" : "No unit assigned",
        expectedDelayMinutes: null,
      });
    }
  }

  return {
    assignments,
    uncovered: uncovered.filter((u) => !covered.has(u.incidentId)),
    conflicts: Array.isArray(raw.conflicts) ? raw.conflicts : [],
    dropped,
  };
}
