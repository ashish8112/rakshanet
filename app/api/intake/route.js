// Owner: Ashish
// POST /api/intake { text } -> { type, description, placeQuery, peopleAffected, language, missing, source }
// Turns what the caller said (English / Hindi / Kannada / mixed, typed or spoken) into the New emergency form.
// The dispatcher still checks the result and confirms the place before saving.
import { NextResponse } from "next/server";
import { generateAgentJson } from "@/lib/agents/gemini";
import { callIntakeInstruction } from "@/lib/agents/prompts/callIntake";

const TYPES = new Set(["fire", "flood", "collapse", "accident", "medical", "other"]);

// Used when Gemini is unavailable: simple keywords in English, Hindi and Kannada (romanised and script).
const KEYWORDS = [
  ["fire", /fire|smoke|burn|aag|आग|धुआं|ಬೆಂಕಿ|benki/i],
  ["flood", /flood|water|rain|drown|paani|बाढ़|पानी|ನೀರು|neeru|ಪ್ರವಾಹ/i],
  ["collapse", /collapse|building fell|wall fell|gir gaya|गिर|ಕುಸಿ/i],
  ["accident", /accident|crash|collid|hit by|takkar|टक्कर|दुर्घटना|ಅಪಘಾತ/i],
  ["medical", /heart|unconscious|bleed|breath|heat stroke|faint|behosh|बेहोश|ಪ್ರಜ್ಞೆ/i],
];

function backupIntake(text) {
  const type = KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? "other";
  const people = text.match(/\b(\d{1,4})\s*(people|persons|log|students|ಜನ|लोग)/i);
  return {
    type,
    description: text.trim().slice(0, 400),
    placeQuery: null,
    peopleAffected: people ? Number(people[1]) : null,
    language: "unknown",
    missing: ["Where exactly is it?"],
    source: "backup",
  };
}

const valid = (o) =>
  o && TYPES.has(o.type) && typeof o.description === "string" && o.description.trim() &&
  (o.placeQuery === null || typeof o.placeQuery === "string") &&
  (o.peopleAffected === null || (Number.isInteger(o.peopleAffected) && o.peopleAffected >= 0)) ||
  "type must be one of fire/flood/collapse/accident/medical/other, description a sentence, placeQuery a string or null, peopleAffected a whole number or null";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "INVALID_JSON", message: "Could not read the call text." } }, { status: 400 });
  }
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 2000) : "";
  if (text.length < 5) {
    return NextResponse.json({ ok: false, error: { code: "TOO_SHORT", message: "Type or say a little more about the emergency first." } }, { status: 400 });
  }
  try {
    const out = await generateAgentJson({ systemInstruction: callIntakeInstruction, prompt: `Caller said:\n${text}`, validate: valid });
    return NextResponse.json({
      ok: true,
      data: {
        type: out.type,
        description: out.description.trim(),
        placeQuery: out.placeQuery?.trim() || null,
        peopleAffected: out.peopleAffected ?? null,
        language: typeof out.language === "string" ? out.language : "unknown",
        missing: Array.isArray(out.missing) ? out.missing.filter((m) => typeof m === "string").slice(0, 4) : [],
        source: "ai",
      },
    });
  } catch {
    return NextResponse.json({ ok: true, data: backupIntake(text) });
  }
}
