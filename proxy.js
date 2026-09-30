// Guards every page and API behind the dispatcher sign-in (see lib/auth.js).
// Pages redirect to /login; APIs answer 401 in the usual { ok: false, error } envelope.
// Scripts (e.g. resetting demo data with curl) can send the header `x-dispatcher-password` instead of a cookie.
import { NextResponse } from "next/server";
import { SESSION_COOKIE, authEnabled, passwordMatches, readSessionToken } from "@/lib/auth";

const OPEN_PATHS = ["/login", "/api/auth/"];

export async function proxy(request) {
  if (!authEnabled()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (OPEN_PATHS.some((path) => pathname === path || pathname.startsWith(path))) return NextResponse.next();

  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (session || passwordMatches(request.headers.get("x-dispatcher-password"))) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Please sign in first." } },
      { status: 401 }
    );
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next.js build files and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
