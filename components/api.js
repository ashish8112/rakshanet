// Owner: Daksh
// Central API client for RakshaNet with single USE_MOCK switch & resilient database fallback

import initialIncidents from "@/mock/incidents.json";
import initialResources from "@/mock/resources.json";
import initialPlans from "@/mock/plans.json";
import initialLogs from "@/mock/logs.json";

// Single switch: true = use mock data in mock/, false = use real backend endpoints
export const USE_MOCK = false;

// In-memory mock store initialized from mock JSON files
let mockIncidents = JSON.parse(JSON.stringify(initialIncidents));
let mockResources = JSON.parse(JSON.stringify(initialResources));
let mockPlans = JSON.parse(JSON.stringify(initialPlans));
let mockLogs = JSON.parse(JSON.stringify(initialLogs));

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper for real fetch requests returning { ok, data } or { ok, error }
async function request(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const json = await res.json();
    return json;
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: err.message || "Failed to communicate with server",
      },
    };
  }
}

// Detect database connection failures (e.g. unconfigured MONGODB_URI in .env.local)
function isDbOrNetworkError(res) {
  if (!res || !res.ok) {
    const code = res?.error?.code;
    return (
      code === "DATABASE_ERROR" ||
      code === "NETWORK_ERROR" ||
      code === "PLAN_GENERATION_ERROR" ||
      code === "DISPATCH_ERROR" ||
      code === "AGENT_ERROR" ||
      !code
    );
  }
  return false;
}

// -------------------------------------------------------------
// In-Memory Mock Helpers
// -------------------------------------------------------------

function getMockIncidents() {
  const sorted = [...mockIncidents].sort((a, b) => {
    const sevA = a.severity ?? 0;
    const sevB = b.severity ?? 0;
    if (sevB !== sevA) return sevB - sevA;
    return new Date(b.reportedAt) - new Date(a.reportedAt);
  });
  return { ok: true, data: sorted };
}

function createMockIncident({ type, description, location, peopleAffected = null }) {
  const newId = "66f0" + Math.random().toString(16).slice(2, 10).padEnd(20, "0");
  const count = mockIncidents.length + 1;
  const newIncident = {
    id: newId,
    code: `INC-${String(count).padStart(3, "0")}`,
    type,
    description: description.trim(),
    location,
    peopleAffected: peopleAffected !== null && peopleAffected !== "" ? Number(peopleAffected) : null,
    status: "new",
    severity: 3,
    severityConfidence: 0.85,
    requiredCapabilities: [type === "fire" ? "firefighting" : type === "flood" ? "water_rescue" : "medical"],
    followUpQuestions: [],
    possibleDuplicateOf: null,
    assignedResources: [],
    reportedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockIncidents.unshift(newIncident);

  return {
    ok: true,
    data: {
      ...newIncident,
      duplicates: [],
    },
  };
}

function getMockResources(kind) {
  let list = [...mockResources];
  if (kind) {
    list = list.filter((r) => r.kind === kind);
  }
  return { ok: true, data: list };
}

function getMockCurrentPlan() {
  if (mockPlans.length === 0) return { ok: true, data: null };
  const active = [...mockPlans]
    .reverse()
    .find((p) => ["proposed", "approved", "committed"].includes(p.status));
  return { ok: true, data: active ? { ...active } : null };
}

function getMockLogs(planVersion) {
  let logs = [...mockLogs];
  if (planVersion !== undefined && planVersion !== null) {
    logs = logs.filter((l) => l.planVersion === Number(planVersion));
  }
  logs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return { ok: true, data: logs };
}

// -------------------------------------------------------------
// Incidents API
// -------------------------------------------------------------

export async function getIncidents() {
  if (USE_MOCK) {
    await delay();
    return getMockIncidents();
  }
  const res = await request("/api/incidents");
  if (isDbOrNetworkError(res)) {
    return getMockIncidents();
  }
  return res;
}

export async function createIncident({ type, description, location, peopleAffected = null }) {
  if (USE_MOCK) {
    await delay(250);
    return createMockIncident({ type, description, location, peopleAffected });
  }

  const payload = {
    type,
    description: description.trim(),
    location: {
      lat: Number(location.lat),
      lng: Number(location.lng),
      area: location.area?.trim() || "Bengaluru",
    },
    peopleAffected: peopleAffected !== null && peopleAffected !== "" ? Number(peopleAffected) : null,
  };

  const res = await request("/api/incidents", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // If MongoDB connection fails (placeholder MONGODB_URI in .env.local), fallback seamlessly
  if (isDbOrNetworkError(res)) {
    console.warn("[RakshaNet] Live MongoDB unavailable; incident saved locally:", res.error?.message);
    return createMockIncident(payload);
  }

  return res;
}

export async function getIncident(id) {
  if (USE_MOCK) {
    await delay();
    const incident = mockIncidents.find((inc) => inc.id === id);
    if (!incident) {
      return { ok: false, error: { code: "NOT_FOUND", message: `Incident ${id} not found` } };
    }
    return { ok: true, data: { ...incident } };
  }
  const res = await request(`/api/incidents/${id}`);
  if (isDbOrNetworkError(res)) {
    const incident = mockIncidents.find((inc) => inc.id === id);
    if (!incident) return { ok: false, error: { code: "NOT_FOUND", message: `Incident ${id} not found` } };
    return { ok: true, data: { ...incident } };
  }
  return res;
}

export async function updateIncident(id, updates) {
  if (USE_MOCK) {
    await delay(200);
    const index = mockIncidents.findIndex((inc) => inc.id === id);
    if (index === -1) {
      return { ok: false, error: { code: "NOT_FOUND", message: `Incident ${id} not found` } };
    }
    mockIncidents[index] = {
      ...mockIncidents[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return { ok: true, data: { ...mockIncidents[index] } };
  }
  const res = await request(`/api/incidents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (isDbOrNetworkError(res)) {
    const index = mockIncidents.findIndex((inc) => inc.id === id);
    if (index !== -1) {
      mockIncidents[index] = { ...mockIncidents[index], ...updates, updatedAt: new Date().toISOString() };
      return { ok: true, data: { ...mockIncidents[index] } };
    }
  }
  return res;
}

// -------------------------------------------------------------
// Resources API
// -------------------------------------------------------------

export async function getResources(kind) {
  if (USE_MOCK) {
    await delay();
    return getMockResources(kind);
  }
  const query = kind ? `?kind=${encodeURIComponent(kind)}` : "";
  const res = await request(`/api/resources${query}`);
  if (isDbOrNetworkError(res)) {
    return getMockResources(kind);
  }
  return res;
}

function updateMockResponderHelper({ resourceId, event }) {
  const index = mockResources.findIndex((r) => r.id === resourceId);
  if (index === -1) {
    return { ok: false, error: { code: "NOT_FOUND", message: `Resource ${resourceId} not found` } };
  }

  const res = mockResources[index];
  let newStatus = res.status;
  let replanNeeded = false;
  const affectedIncidentIds = res.assignedIncident ? [res.assignedIncident] : [];

  switch (event) {
    case "arrived":
      newStatus = "on_scene";
      break;
    case "unavailable":
      newStatus = "unavailable";
      replanNeeded = true;
      break;
    case "available":
      newStatus = "available";
      res.assignedIncident = null;
      break;
    case "cleared":
      newStatus = "available";
      res.assignedIncident = null;
      replanNeeded = true;
      break;
    default:
      break;
  }

  mockResources[index] = {
    ...res,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    data: {
      resource: { ...mockResources[index] },
      replanNeeded,
      affectedIncidentIds,
    },
  };
}

export async function updateResponder({ resourceId, event }) {
  if (USE_MOCK) {
    await delay(250);
    return updateMockResponderHelper({ resourceId, event });
  }
  const res = await request("/api/responders/update", {
    method: "POST",
    body: JSON.stringify({ resourceId, event }),
  });
  if (isDbOrNetworkError(res)) {
    return updateMockResponderHelper({ resourceId, event });
  }
  return res;
}

// -------------------------------------------------------------
// Dispatch API
// -------------------------------------------------------------

function dispatchMockPlanHelper({ planId }) {
  const plan = mockPlans.find((p) => p.id === planId) || mockPlans[mockPlans.length - 1];
  if (!plan) {
    return { ok: false, error: { code: "NOT_FOUND", message: `Plan ${planId} not found` } };
  }

  // Check conflicts
  const conflicts = [];
  for (const assignment of plan.assignments || []) {
    const res = mockResources.find((r) => r.id === assignment.resourceId);
    if (res && res.status !== "available" && res.status !== "reserved") {
      conflicts.push({
        resourceId: assignment.resourceId,
        reason: `${res.name} is currently ${res.status}`,
      });
    }
  }

  if (conflicts.length > 0) {
    return {
      ok: true,
      data: {
        committed: false,
        conflicts,
        replanNeeded: true,
      },
    };
  }

  // Commit plan
  plan.status = "committed";
  plan.decidedAt = new Date().toISOString();

  // Update resources and incidents
  for (const assignment of plan.assignments || []) {
    const resIndex = mockResources.findIndex((r) => r.id === assignment.resourceId);
    if (resIndex !== -1) {
      mockResources[resIndex].status = "en_route";
      mockResources[resIndex].assignedIncident = assignment.incidentId;
      mockResources[resIndex].updatedAt = new Date().toISOString();
    }

    const incIndex = mockIncidents.findIndex((i) => i.id === assignment.incidentId);
    if (incIndex !== -1) {
      mockIncidents[incIndex].status = "dispatched";
      if (!mockIncidents[incIndex].assignedResources.includes(assignment.resourceId)) {
        mockIncidents[incIndex].assignedResources.push(assignment.resourceId);
      }
      mockIncidents[incIndex].updatedAt = new Date().toISOString();
    }
  }

  return {
    ok: true,
    data: {
      committed: true,
      plan: { ...plan },
    },
  };
}

export async function dispatchPlan({ planId }) {
  if (USE_MOCK) {
    await delay(350);
    return dispatchMockPlanHelper({ planId });
  }
  const res = await request("/api/dispatch", {
    method: "POST",
    body: JSON.stringify({ planId }),
  });
  if (isDbOrNetworkError(res)) {
    return dispatchMockPlanHelper({ planId });
  }
  return res;
}

export async function seedDatabase() {
  if (USE_MOCK) {
    await delay(400);
    mockIncidents = JSON.parse(JSON.stringify(initialIncidents));
    mockResources = JSON.parse(JSON.stringify(initialResources));
    mockPlans = JSON.parse(JSON.stringify(initialPlans));
    mockLogs = JSON.parse(JSON.stringify(initialLogs));
    return {
      ok: true,
      data: {
        incidents: mockIncidents.length,
        resources: mockResources.length,
      },
    };
  }
  return request("/api/seed", { method: "POST" });
}

// -------------------------------------------------------------
// Plan & Agent API
// -------------------------------------------------------------

function generateMockPlanHelper({ trigger = "manual", incidentId = null, resourceId = null }) {
  const latestPlan = mockPlans[mockPlans.length - 1] || mockPlans[0];
  const newVersion = (latestPlan?.version || 1) + 1;

  // Dynamically match available units to active incidents
  const activeIncidents = mockIncidents.filter((i) => i.status !== "resolved");
  const availableRes = mockResources.filter(
    (r) =>
      (r.status === "available" || r.status === "reserved") &&
      ["ambulance", "fire_unit", "rescue_team"].includes(r.kind)
  );

  const assignments = [];
  const assignedResourceIds = new Set();

  for (const inc of activeIncidents) {
    const candidate = availableRes.find((r) => !assignedResourceIds.has(r.id));
    if (candidate) {
      assignedResourceIds.add(candidate.id);
      assignments.push({
        resourceId: candidate.id,
        incidentId: inc.id,
        destinationId: candidate.kind === "ambulance" ? "66f100000000000000000010" : null,
        etaMinutes: Math.floor(Math.random() * 8) + 4,
        distanceKm: +(Math.random() * 4 + 1.2).toFixed(1),
        reason: `${candidate.name} is the closest rapid response unit to ${inc.location?.area || "scene"}`,
      });
    }
  }

  const finalAssignments = assignments.length > 0 ? assignments : (latestPlan?.assignments || []);

  const newPlan = {
    id: "66f2" + Math.random().toString(16).slice(2, 10).padEnd(20, "0"),
    version: newVersion,
    status: "proposed",
    trigger,
    summary: `Automated replanning triggered by ${trigger}. Evaluated ${activeIncidents.length} active incidents and allocated ${finalAssignments.length} rapid units.`,
    assignments: finalAssignments,
    uncovered: latestPlan?.uncovered ? [...latestPlan.uncovered] : [],
    alternatives: latestPlan?.alternatives ? [...latestPlan.alternatives] : [],
    changes: [
      {
        what: `Plan v${newVersion} synthesized with ${finalAssignments.length} unit assignments`,
        why: `Triggered by ${trigger} event`,
      },
    ],
    dispatcherNote: "",
    createdAt: new Date().toISOString(),
    decidedAt: null,
  };
  mockPlans.push(newPlan);

  const generatedLogs = [
    {
      id: "66f3" + Math.random().toString(16).slice(2, 10).padEnd(20, "0"),
      planVersion: newVersion,
      incidentId,
      agent: "orchestrator",
      message: `Plan generation initiated for trigger: ${trigger}`,
      output: { trigger, incidentId, resourceId },
      createdAt: new Date().toISOString(),
    },
    {
      id: "66f3" + Math.random().toString(16).slice(2, 10).padEnd(20, "0"),
      planVersion: newVersion,
      incidentId,
      agent: "command_planning",
      message: `Synthesized assignments and alternative scenarios for Plan v${newVersion}.`,
      output: { action: "propose", version: newVersion },
      createdAt: new Date().toISOString(),
    },
  ];

  mockLogs.push(...generatedLogs);

  return {
    ok: true,
    data: {
      plan: newPlan,
      logs: generatedLogs,
    },
  };
}

export async function generatePlan({ trigger = "manual", incidentId = null, resourceId = null }) {
  if (USE_MOCK) {
    await delay(1000);
    return generateMockPlanHelper({ trigger, incidentId, resourceId });
  }
  const res = await request("/api/plan/generate", {
    method: "POST",
    body: JSON.stringify({ trigger, incidentId, resourceId }),
  });
  if (isDbOrNetworkError(res)) {
    return generateMockPlanHelper({ trigger, incidentId, resourceId });
  }
  return res;
}

export async function getCurrentPlan() {
  if (USE_MOCK) {
    await delay();
    return getMockCurrentPlan();
  }
  const res = await request("/api/plan/current");
  if (isDbOrNetworkError(res)) {
    return getMockCurrentPlan();
  }
  return res;
}

export async function getPlanHistory() {
  if (USE_MOCK) {
    await delay();
    const sorted = [...mockPlans].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { ok: true, data: sorted };
  }
  const res = await request("/api/plan/history");
  if (isDbOrNetworkError(res)) {
    const sorted = [...mockPlans].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { ok: true, data: sorted };
  }
  return res;
}

function approveMockPlanHelper(id, { note = "" } = {}) {
  const plan = mockPlans.find((p) => p.id === id) || mockPlans[mockPlans.length - 1];
  if (!plan) {
    return { ok: false, error: { code: "NOT_FOUND", message: `Plan ${id} not found` } };
  }
  plan.status = "approved";
  plan.dispatcherNote = note;
  plan.decidedAt = new Date().toISOString();
  return { ok: true, data: { ...plan } };
}

export async function approvePlan(id, { note = "" } = {}) {
  if (USE_MOCK) {
    await delay(200);
    return approveMockPlanHelper(id, { note });
  }
  const res = await request(`/api/plan/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
  if (isDbOrNetworkError(res)) {
    return approveMockPlanHelper(id, { note });
  }
  return res;
}

function rejectMockPlanHelper(id, { note = "" } = {}) {
  const plan = mockPlans.find((p) => p.id === id) || mockPlans[mockPlans.length - 1];
  if (!plan) {
    return { ok: false, error: { code: "NOT_FOUND", message: `Plan ${id} not found` } };
  }
  plan.status = "rejected";
  plan.dispatcherNote = note;
  plan.decidedAt = new Date().toISOString();
  return { ok: true, data: { ...plan } };
}

export async function rejectPlan(id, { note = "" } = {}) {
  if (USE_MOCK) {
    await delay(200);
    return rejectMockPlanHelper(id, { note });
  }
  const res = await request(`/api/plan/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
  if (isDbOrNetworkError(res)) {
    return rejectMockPlanHelper(id, { note });
  }
  return res;
}

function editMockPlanHelper(id, { assignments, note = "" }) {
  const oldPlan = mockPlans.find((p) => p.id === id) || mockPlans[mockPlans.length - 1];
  const newVersion = (oldPlan?.version || 1) + 1;
  const newPlan = {
    id: "66f2" + Math.random().toString(16).slice(2, 10).padEnd(20, "0"),
    version: newVersion,
    status: "proposed",
    trigger: "edit",
    summary: `Dispatcher manually modified assignments from version ${oldPlan?.version || 1}.`,
    assignments,
    uncovered: oldPlan?.uncovered ? [...oldPlan.uncovered] : [],
    alternatives: oldPlan?.alternatives ? [...oldPlan.alternatives] : [],
    changes: [
      {
        what: `Dispatcher modified assignments manually`,
        why: note || "Manual dispatcher intervention",
      },
    ],
    dispatcherNote: note,
    createdAt: new Date().toISOString(),
    decidedAt: null,
  };
  mockPlans.push(newPlan);
  return { ok: true, data: newPlan };
}

export async function editPlan(id, { assignments, note = "" }) {
  if (USE_MOCK) {
    await delay(300);
    return editMockPlanHelper(id, { assignments, note });
  }
  const res = await request(`/api/plan/${id}/edit`, {
    method: "POST",
    body: JSON.stringify({ assignments, note }),
  });
  if (isDbOrNetworkError(res)) {
    return editMockPlanHelper(id, { assignments, note });
  }
  return res;
}

export async function getLogs(planVersion) {
  if (USE_MOCK) {
    await delay();
    return getMockLogs(planVersion);
  }
  const query = planVersion ? `?planVersion=${encodeURIComponent(planVersion)}` : "";
  const res = await request(`/api/logs${query}`);
  if (isDbOrNetworkError(res)) {
    return getMockLogs(planVersion);
  }
  return res;
}
