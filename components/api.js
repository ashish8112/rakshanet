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

// Units, hospitals, shelters
export const getResources = () => request("/api/resources");
export const updateResponder = (resourceId, event) => request("/api/responders/update", { method: "POST", body: { resourceId, event } });

// AI plans
export const generatePlan = ({ trigger = "manual", incidentId = null, resourceId = null } = {}) =>
  request("/api/plan/generate", { method: "POST", body: { trigger, incidentId, resourceId } });
export const getCurrentPlan = () => request("/api/plan/current");
export const approvePlan = (id, note = "") => request(`/api/plan/${id}/approve`, { method: "POST", body: { note } });
export const rejectPlan = (id, note = "") => request(`/api/plan/${id}/reject`, { method: "POST", body: { note } });
export const dispatchPlan = (planId) => request("/api/dispatch", { method: "POST", body: { planId } });
export const getLogs = (planVersion) => request(planVersion ? `/api/logs?planVersion=${planVersion}` : "/api/logs");
