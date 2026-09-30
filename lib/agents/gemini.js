import { GoogleGenAI } from "@google/genai";

const MAX_CALLS = 4; // total Gemini calls per agent step (first try + 3 retries)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Google's "busy" answers: worth waiting a moment and trying again.
function isTemporary(error) {
  const status = error?.status ?? error?.code;
  const text = String(error?.message ?? "");
  return status === 429 || status === 500 || status === 503 ||
    /high demand|overloaded|UNAVAILABLE|RESOURCE_EXHAUSTED|try again/i.test(text);
}

// Calls Gemini and returns parsed JSON.
// `validate(output)` (optional) returns true when the output is fine, or false / a string saying what is wrong.
// Retries on: Google busy errors, unparseable JSON, and output that fails `validate`
// (the retry tells Gemini what was wrong so it can fix it).
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
        contents: lastProblem ? `${prompt}\n\nYour previous answer was rejected: ${lastProblem}. Return corrected JSON only.` : prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      });
    } catch (error) {
      if (!isTemporary(error) || call === MAX_CALLS) {
        throw new Error("Could not call Gemini; check the model's availability and API key.", { cause: error });
      }
      await sleep(1500 * call); // 1.5 s, 3 s, 4.5 s
      continue;
    }

    let output;
    try {
      output = JSON.parse(response.text);
    } catch {
      lastProblem = "bad JSON";
      continue;
    }
    const verdict = validate ? validate(output) : true;
    if (verdict !== true) {
      lastProblem = typeof verdict === "string" ? verdict : "output did not match the contract";
      continue;
    }
    return output;
  }
  throw new Error(`Could not parse Gemini's JSON response after ${MAX_CALLS} attempts (${lastProblem}); check the model output.`);
}
