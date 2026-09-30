// Dispatcher sign-in: one shared password (env DISPATCHER_PASSWORD), a signed session cookie.
// The cookie holds { name, exp } plus an HMAC-SHA256 signature, so it cannot be forged or edited.
// Uses Web Crypto, which works both in proxy.js and in route handlers.

export const SESSION_COOKIE = "rn_session";
export const SESSION_HOURS = 12;

const encoder = new TextEncoder();

function toBase64Url(bytes) {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  const text = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(text, (char) => char.charCodeAt(0));
}

// Sign-in is switched on when DISPATCHER_PASSWORD is set (it is on Vercel). Without it the app stays open,
// which keeps local development simple.
export function authEnabled() {
  return Boolean(process.env.DISPATCHER_PASSWORD);
}

function secret() {
  return process.env.AUTH_SECRET || `rakshanet:${process.env.DISPATCHER_PASSWORD ?? ""}`;
}

async function hmac(data) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

// Compare without leaking how many characters matched.
function sameText(a, b) {
  const x = encoder.encode(String(a));
  const y = encoder.encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function passwordMatches(password) {
  return authEnabled() && sameText(password ?? "", process.env.DISPATCHER_PASSWORD);
}

export async function createSessionToken(name) {
  const payload = toBase64Url(encoder.encode(JSON.stringify({ name, exp: Date.now() + SESSION_HOURS * 3600 * 1000 })));
  return `${payload}.${toBase64Url(await hmac(payload))}`;
}

// Returns { name } for a valid, unexpired token, otherwise null.
export async function readSessionToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  try {
    if (!sameText(signature, toBase64Url(await hmac(payload)))) return null;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    return data.exp > Date.now() && typeof data.name === "string" ? { name: data.name } : null;
  } catch {
    return null;
  }
}
