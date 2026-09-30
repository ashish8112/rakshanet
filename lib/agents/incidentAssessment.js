import { generateAgentJson } from "./gemini";
import { incidentAssessmentInstruction } from "./prompts/incidentAssessment";

const capabilities = new Set(["medical", "fire", "rescue", "beds", "shelter"]);
const keys = ["severity", "confidence", "requiredCapabilities", "peopleEstimate", "followUpQuestions", "reasoning"];

export async function assessIncident(incident) {
  const report = {
    type: incident.type,
    description: incident.description,
    location: incident.location,
    peopleAffected: incident.peopleAffected,
  };
  const output = await generateAgentJson({
    systemInstruction: incidentAssessmentInstruction,
    prompt: `Assess this incident report:\n${JSON.stringify(report)}`,
  });

  if (
    !output || typeof output !== "object" || Array.isArray(output) ||
    Object.keys(output).length !== keys.length || keys.some((key) => !Object.hasOwn(output, key)) ||
    !Number.isInteger(output.severity) || output.severity < 1 || output.severity > 5 ||
    !["high", "low"].includes(output.confidence) ||
    !Array.isArray(output.requiredCapabilities) || output.requiredCapabilities.some((item) => !capabilities.has(item)) ||
    (output.peopleEstimate !== null && (!Number.isInteger(output.peopleEstimate) || output.peopleEstimate < 0)) ||
    !Array.isArray(output.followUpQuestions) || output.followUpQuestions.some((item) => typeof item !== "string") ||
    typeof output.reasoning !== "string" || !output.reasoning.trim()
  ) {
    throw new Error("Could not use Gemini's incident assessment; check its contract fields and values.");
  }
  return output;
}
