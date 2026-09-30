// Response envelope helpers for Ashish's routes: { ok, data } or { ok: false, error }.
import { NextResponse } from "next/server";

export const ok = (data, status = 200) => NextResponse.json({ ok: true, data }, { status });

export function fail(error, fallbackMessage) {
  if (error?.status) {
    return NextResponse.json({ ok: false, error: { code: error.code, message: error.message, ...error.extra } }, { status: error.status });
  }
  console.error(fallbackMessage, error);
  return NextResponse.json({ ok: false, error: { code: "DATABASE_ERROR", message: fallbackMessage } }, { status: 500 });
}

// Reads a JSON body; an empty body counts as {}.
export async function readBody(request) {
  const text = await request.text();
  if (!text.trim()) return {};
  const body = JSON.parse(text);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new SyntaxError("Body must be an object");
  return body;
}

export const badJson = () =>
  NextResponse.json({ ok: false, error: { code: "INVALID_JSON", message: "Could not read the request; check the JSON body." } }, { status: 400 });
