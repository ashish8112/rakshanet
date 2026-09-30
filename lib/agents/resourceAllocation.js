// Resource Allocation agent (Gemini): decides which unit goes to which incident.
// Gemini only chooses ids and writes reasons; distance and ETA are copied from the tools.
import { generateAgentJson } from "./gemini";
import { resourceAllocationInstruction } from "./prompts/resourceAllocation";

const isText = (value) => typeof value === "string" && value.trim().length > 0;

// `routed`: [{ incident, details: { candidates, destinationOptions }, onScene, previousUnits }], most severe first.
export async function allocateResources(routed) {
  const byIncident = new Map(routed.map((entry) => [String(entry.incident.id), entry]));

  const validate = (output) => {
    if (!output || !Array.isArray(output.assignments) || !Array.isArray(output.uncovered)) return false;
    const used = new Set();
    for (const a of output.assignments) {
      const entry = byIncident.get(String(a?.incidentId));
      if (!entry || !isText(a.reason)) return false;
      if (!entry.details.candidates.some((c) => c.resourceId === String(a.resourceId))) return false;
      if (used.has(String(a.resourceId))) return false; // one unit, one incident
      used.add(String(a.resourceId));
      const destination = a.destinationId ?? null;
      if (destination !== null && !entry.details.destinationOptions.some((d) => d.resourceId === String(destination))) return false;
    }
    return output.uncovered.every((u) => byIncident.has(String(u?.incidentId)) && isText(u.reason));
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
  const assignments = raw.assignments.map((a) => {
    const candidate = byIncident.get(String(a.incidentId)).details.candidates
      .find((c) => c.resourceId === String(a.resourceId));
    return {
      incidentId: String(a.incidentId),
      resourceId: candidate.resourceId,
      destinationId: a.destinationId ? String(a.destinationId) : null,
      distanceKm: candidate.distanceKm,
      etaMinutes: candidate.etaMinutes,
      reason: a.reason.trim(),
    };
  });

  // Safety net: an incident that got no unit and was not listed as uncovered is added here.
  const covered = new Set(assignments.map((a) => a.incidentId));
  const uncovered = raw.uncovered.map((u) => ({
    incidentId: String(u.incidentId),
    reason: u.reason.trim(),
    expectedDelayMinutes: null, // escalation delay estimate comes in Phase 3.3
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
  };
}
