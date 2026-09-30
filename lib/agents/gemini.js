import { GoogleGenAI } from "@google/genai";

export async function generateAgentJson({ systemInstruction, prompt }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!apiKey || !model) {
    throw new Error("Could not call Gemini; check GEMINI_API_KEY and GEMINI_MODEL.");
  }

  const ai = new GoogleGenAI({ apiKey });
  for (let attempt = 0; attempt < 2; attempt += 1) {
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
      throw new Error("Could not call Gemini; check the model's availability and API key.", { cause: error });
    }

    try {
      return JSON.parse(response.text);
    } catch {
      if (attempt === 1) {
        throw new Error("Could not parse Gemini's JSON response after two attempts; check the model output.");
      }
    }
  }
}
