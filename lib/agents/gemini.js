import { GoogleGenAI } from "@google/genai";

const MAX_CALLS = 3; // total Gemini calls per agent step (first try + 2 retries)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Google's "busy" answers: worth waiting a moment and trying again.
function isTemporary(error) {
  const status = error?.status ?? error?.code;
  const text = String(error?.message ?? "");
  return status === 429 || status === 500 || status === 503 ||
    /high demand|overloaded|UNAVAILABLE|RESOURCE_EXHAUSTED|try again/i.test(text);
}

// Calls Gemini and returns parsed JSON.
// `validate(output)` (optional) returns true when the output matches the contract.
// Retries on: Google busy errors, unparseable JSON, and output that fails `validate`.
export async function generateAgentJson({ systemInstruction, prompt, validate }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!apiKey || !model) {
    throw new Error("Could not call Gemini; check GEMINI_API_KEY and GEMINI_MODEL.");
  }

  const ai = new GoogleGenAI({ apiKey });
  let lastProblem = "";
  for (let call = 1; call <= MAX_CALLS; call += 1) {
    let response;
    try {
      response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      });
    } catch (error) {
      if (!isTemporary(error) || call === MAX_CALLS) {
        throw new Error("Could not call Gemini; check the model's availability and API key.", { cause: error });
      }
      await sleep(1000 * call); // 1 s, then 2 s
      continue;
    }

    let output;
    try {
      output = JSON.parse(response.text);
    } catch {
      lastProblem = "bad JSON";
      continue;
    }
    if (validate && !validate(output)) {
      lastProblem = "output did not match the contract";
      continue;
    }
    return output;
  }
  throw new Error(`Could not parse Gemini's JSON response after ${MAX_CALLS} attempts (${lastProblem}); check the model output.`);
}
