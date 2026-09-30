import { GoogleGenAI } from "@google/genai";

const MAX_CALLS = 4; // Gemini calls per agent step (first try + 3 retries), plus free switches between keys
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Google's "busy" answers: worth waiting a moment and trying again.
function isTemporary(error) {
  const status = error?.status ?? error?.code;
  const text = String(error?.message ?? "");
  return status === 429 || status === 500 || status === 503 ||
    /high demand|overloaded|UNAVAILABLE|RESOURCE_EXHAUSTED|try again/i.test(text);
}

// The free tier's per-minute limit for this key.
function isRateLimit(error) {
  return (error?.status ?? error?.code) === 429 || /RESOURCE_EXHAUSTED|exceeded your current quota/i.test(String(error?.message ?? ""));
}

// A key Google refuses (typo, deleted, no access): skip it from now on.
function isBadKey(error) {
  const status = error?.status ?? error?.code;
  return status === 401 || status === 403 || /API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(String(error?.message ?? ""));
}

// How long to wait before retrying. On the free tier's per-minute limit (429) Google says how long
// to wait ("retryDelay":"15s"); we follow it (max 20 s). Otherwise 1.5 s, 3 s, 4.5 s.
const MAX_WAIT_MS = 20000;
function waitBeforeRetry(error, call) {
  const hint = String(error?.message ?? "").match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/);
  return hint ? Math.min(MAX_WAIT_MS, Number(hint[1]) * 1000 + 500) : 1500 * call;
}

// Several keys spread the free limit (15 requests/minute per key): GEMINI_API_KEYS="key1,key2,key3".
// GEMINI_API_KEY alone still works. Calls take turns; a rate-limited key hands over to the next one.
const badKeys = new Set();
let keyTurn = 0;
function usableKeys() {
  const all = [...(process.env.GEMINI_API_KEYS ?? "").split(","), process.env.GEMINI_API_KEY ?? ""]
    .map((key) => key.trim()).filter(Boolean);
  return [...new Set(all)].filter((key) => !badKeys.has(key));
}

// Calls Gemini and returns parsed JSON.
// `validate(output)` (optional) returns true when the output is fine, or false / a string saying what is wrong.
// Retries on: Google busy errors, unparseable JSON, and output that fails `validate`
// (the retry tells Gemini what was wrong so it can fix it).
export async function generateAgentJson({ systemInstruction, prompt, validate }) {
  const model = process.env.GEMINI_MODEL;
  if (usableKeys().length === 0 || !model) {
    throw new Error("Could not call Gemini; check GEMINI_API_KEY (or GEMINI_API_KEYS) and GEMINI_MODEL.");
  }

  let lastProblem = "";
  let calls = 0;
  let limitedInARow = 0; // keys that said "per-minute limit" one after another
  while (calls < MAX_CALLS) {
    const keys = usableKeys();
    if (keys.length === 0) throw new Error("Could not call Gemini; every API key was refused, check the keys.");
    const apiKey = keys[keyTurn++ % keys.length];

    let response;
    try {
      response = await new GoogleGenAI({ apiKey }).models.generateContent({
        model,
        contents: lastProblem ? `${prompt}\n\nYour previous answer was rejected: ${lastProblem}. Return corrected JSON only.` : prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      });
    } catch (error) {
      if (isBadKey(error) && keys.length > 1) {
        badKeys.add(apiKey); // try the others, do not count this as an attempt
        continue;
      }
      if (isRateLimit(error) && ++limitedInARow < keys.length) {
        continue; // another key may still have room this minute: switch right away
      }
      calls += 1;
      if (!isTemporary(error) || calls >= MAX_CALLS) {
        throw new Error("Could not call Gemini; check the model's availability and API key.", { cause: error });
      }
      limitedInARow = 0;
      await sleep(waitBeforeRetry(error, calls));
      continue;
    }
    limitedInARow = 0;
    calls += 1;

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
