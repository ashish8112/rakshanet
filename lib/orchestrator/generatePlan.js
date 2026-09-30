import { connectDB, Incident, Plan, AgentLog } from "@/lib/db";
import { assessIncident } from "@/lib/agents/incidentAssessment";

export async function generatePlan({ trigger, incidentId }) {
  await connectDB();
  const incidents = incidentId
    ? await Incident.find({ _id: incidentId })
    : await Incident.find({ status: { $in: ["new", "assessing", "needs_info"] } }).sort({ reportedAt: 1 });
  if (incidents.length === 0) {
    const error = new Error("Could not generate a plan; check that an incident exists and still needs assessment.");
    error.code = "INCIDENT_NOT_FOUND";
    throw error;
  }

  const previous = await Plan.findOne().sort({ version: -1 });
  const version = (previous?.version ?? 0) + 1;
  const assessments = [];
  for (const incident of incidents) {
    const output = await assessIncident(incident);
    assessments.push({ incident, output });
  }

  const plan = await Plan.create({
    version,
    status: "proposed",
    trigger,
    summary: `Assessed ${assessments.length} incident${assessments.length === 1 ? "" : "s"}; resource assignments are pending.`,
    assignments: [],
    uncovered: [],
    alternatives: [],
    changes: [],
    dispatcherNote: "",
  });

  const logs = [];
  for (const { incident, output } of assessments) {
    incident.severity = output.severity;
    incident.severityConfidence = output.confidence;
    incident.requiredCapabilities = output.requiredCapabilities;
    incident.followUpQuestions = output.followUpQuestions;
    if (incident.peopleAffected === null && output.peopleEstimate !== null) {
      incident.peopleAffected = output.peopleEstimate;
    }
    incident.status = output.confidence === "low" && output.followUpQuestions.length > 0 ? "needs_info" : "planned";
    await incident.save();
    logs.push(await AgentLog.create({
      planVersion: version,
      incidentId: incident.id,
      agent: "incident_assessment",
      message: `Severity ${output.severity}, ${output.confidence} confidence: ${output.reasoning}`,
      output,
    }));
  }
  logs.push(await AgentLog.create({
    planVersion: version,
    incidentId: null,
    agent: "orchestrator",
    message: plan.summary,
    output: { assessedIncidentIds: incidents.map((incident) => incident.id), assignments: [] },
  }));
  return { plan, logs };
}
