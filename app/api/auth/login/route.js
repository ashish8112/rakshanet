// Owner: Ashish
// POST /api/auth/login  { name, password } -> { name } and sets the session cookie
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_HOURS, authEnabled, createSessionToken, passwordMatches } from "@/lib/auth";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "INVALID_JSON", message: "Could not read the sign-in form." } }, { status: 400 });
  }
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 40) : "";
  if (!name) {
    return NextResponse.json({ ok: false, error: { code: "NAME_REQUIRED", message: "Please enter your name." } }, { status: 400 });
  }
  if (authEnabled() && !passwordMatches(body.password)) {
    return NextResponse.json({ ok: false, error: { code: "WRONG_PASSWORD", message: "That password is not correct." } }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, data: { name } });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(name), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return response;
}
