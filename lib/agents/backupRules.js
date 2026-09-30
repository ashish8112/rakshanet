// Backup planner: plain rules used when Gemini is unavailable (busy, rate-limited, offline),
// so the control room never stops working. Plans made this way are marked source: "backup".

const RULES = {
  fire: { severity: 4, needs: ["fire", "rescue", "medical"] },
  collapse: { severity: 5, needs: ["rescue", "medical", "fire"] },
  flood: { severity: 4, needs: ["rescue", "shelter"] },
  accident: { severity: 4, needs: ["medical", "rescue"] },
  medical: { severity: 3, needs: ["medical", "beds"] },
  other: { severity: 2, needs: [] },
};

// Same shape as the Incident Assessment agent's output (CONTRACT.md 5.4).
export function backupAssessment(incident) {
  const rule = RULES[incident.type] ?? RULES.other;
  const many = (incident.peopleAffected ?? 0) >= 10;
  const vague = incident.type === "other";
  return {
    severity: Math.min(5, rule.severity + (many ? 1 : 0)),
    confidence: vague ? "low" : "high",
    requiredCapabilities: rule.needs,
    peopleEstimate: incident.peopleAffected ?? null,
    followUpQuestions: vague ? ["What exactly happened, and is anyone hurt or trapped?"] : [],
    reasoning: `Backup rules (AI unavailable): standard response for a ${incident.type}${many ? " with many people affected" : ""}.`,
  };
}

// Same shape as the Command and Planning agent's output.
export function backupCommand({ allocation, incidents, codeOf }) {
  const top = incidents.find((i) => allocation.assignments.some((a) => a.incidentId === String(i.id)));
  const units = allocation.assignments.length;
  const summary = units === 0
    ? "Backup plan (AI unavailable): no free unit matches the open emergencies right now."
    : `Backup plan (AI unavailable): ${units} unit${units === 1 ? "" : "s"} sent by nearest-free-unit rules, most serious first` +
      (top ? `, starting with ${codeOf(top.id)} in ${top.location.area}.` : ".") +
      (allocation.uncovered.length ? ` ${allocation.uncovered.length} emergenc${allocation.uncovered.length === 1 ? "y is" : "ies are"} short of help.` : "");
  return { action: "propose", summary, alternatives: [], changes: [], investigate: null };
}
