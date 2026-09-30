// All calls from the screen to the backend (CONTRACT.md 5.2). Every call returns { ok, data } or { ok: false, error }.
"use client";

async function request(url, { method = "GET", body } = {}) {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth/")) {
      window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return { ok: false, error: { code: "UNAUTHORIZED", message: "Please sign in again." } };
    }
    return await res.json();
  } catch {
    return { ok: false, error: { code: "NETWORK_ERROR", message: "Could not reach the server. Check your internet and try again." } };
  }
}

// Sign-in
export const signIn = (name, password) => request("/api/auth/login", { method: "POST", body: { name, password } });
export const signOut = () => request("/api/auth/logout", { method: "POST" });
export const whoAmI = () => request("/api/auth/me");

// Emergencies
export const getIncidents = () => request("/api/incidents");
export const createIncident = (incident) => request("/api/incidents", { method: "POST", body: incident });
export const updateIncident = (id, changes) => request(`/api/incidents/${id}`, { method: "PATCH", body: changes });

// What the caller said -> the New emergency form (type, description, place, people)
export const readCall = (text) => request("/api/intake", { method: "POST", body: { text } });

// Place search ("Kristu Jayanti University" -> coordinates)
export const searchPlaces = (q) => request(`/api/geocode?q=${encodeURIComponent(q)}`);

// Units, hospitals, shelters
export const getResources = () => request("/api/resources");
export const addResource = (unit) => request("/api/resources", { method: "POST", body: unit });
export const removeResource = (id) => request(`/api/resources/${id}`, { method: "DELETE" });

// History
export const getActivity = (incidentId) => request(incidentId ? `/api/activity?incidentId=${incidentId}` : "/api/activity");
export const updateResponder = (resourceId, event) => request("/api/responders/update", { method: "POST", body: { resourceId, event } });

// AI plans
export const generatePlan = ({ trigger = "manual", incidentId = null, resourceId = null } = {}) =>
  request("/api/plan/generate", { method: "POST", body: { trigger, incidentId, resourceId } });
// Same as generatePlan, but calls onStep(step) for every live step while the AI works.
export async function streamPlan({ trigger = "manual", incidentId = null, resourceId = null } = {}, onStep = () => {}) {
  let res;
  try {
    res = await fetch("/api/plan/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger, incidentId, resourceId }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: { code: "NETWORK_ERROR", message: "Could not reach the server. Check your internet and try again." } };
  }
  if (res.status === 401) {
    window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    return { ok: false, error: { code: "UNAUTHORIZED", message: "Please sign in again." } };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final = null;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        const message = JSON.parse(line);
        if (message.type === "step") onStep(message);
        else if (message.type === "done") final = message;
      }
    }
  } catch {
    return { ok: false, error: { code: "NETWORK_ERROR", message: "The connection dropped while the AI was planning. Try again." } };
  }
  return final ? (final.ok ? { ok: true, data: final.data } : { ok: false, error: final.error }) : { ok: false, error: { code: "NO_RESULT", message: "The AI did not finish. Try again." } };
}

export const getCurrentPlan = () => request("/api/plan/current");
export const getPlanHistory = () => request("/api/plan/history");
export const manualPlan = ({ incidentId, resourceIds, destinationId = null, note = "" }) =>
  request("/api/plan/manual", { method: "POST", body: { incidentId, resourceIds, destinationId, note } });
export const approvePlan =(id, note = "") => request(`/api/plan/${id}/approve`, { method: "POST", body: { note } });
export const rejectPlan = (id, note = "") => request(`/api/plan/${id}/reject`, { method: "POST", body: { note } });
export const dispatchPlan = (planId) => request("/api/dispatch", { method: "POST", body: { planId } });
export const getLogs = (planVersion) => request(planVersion ? `/api/logs?planVersion=${planVersion}` : "/api/logs");
