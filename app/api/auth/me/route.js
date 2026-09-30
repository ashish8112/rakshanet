// Owner: Ashish
// GET /api/auth/me -> { name, authEnabled } for the header ("Signed in as ...")
import { NextResponse } from "next/server";
import { SESSION_COOKIE, authEnabled, readSessionToken } from "@/lib/auth";

export async function GET(request) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ ok: true, data: { name: session?.name ?? null, authEnabled: authEnabled() } });
}
