// Contract-shaped demo tools. Switch to Sam's real tools by changing the import in an agent.
const resources = [
  { id: "000000000000000000000001", code: "AMB-01", kind: "ambulance", name: "Stub Ambulance 01", status: "available", location: { lat: 12.9352, lng: 77.6245, area: "Koramangala" }, capabilities: ["medical"], capacity: null, assignedIncident: null },
  { id: "000000000000000000000002", code: "FIR-01", kind: "fire_unit", name: "Stub Fire Unit 01", status: "available", location: { lat: 12.9716, lng: 77.6412, area: "Indiranagar" }, capabilities: ["fire", "rescue"], capacity: null, assignedIncident: null },
  { id: "000000000000000000000003", code: "RES-01", kind: "rescue_team", name: "Stub Rescue Team 01", status: "available", location: { lat: 12.9352, lng: 77.6245, area: "Koramangala" }, capabilities: ["rescue"], capacity: null, assignedIncident: null },
  { id: "000000000000000000000004", code: "HOS-01", kind: "hospital", name: "Stub Hospital 01", status: "available", location: { lat: 12.9299, lng: 77.6188, area: "Koramangala" }, capabilities: ["beds"], capacity: { total: 40, used: 12 }, assignedIncident: null },
  { id: "000000000000000000000005", code: "SHE-01", kind: "shelter", name: "Stub Shelter 01", status: "available", location: { lat: 12.9500, lng: 77.6200, area: "Adugodi" }, capabilities: ["shelter"], capacity: { total: 100, used: 20 }, assignedIncident: null },
];
for (const resource of resources) resource.updatedAt = "2026-09-30T14:00:00.000Z";

export function distanceKm(a, b) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitude = radians(b.lat - a.lat);
  const longitude = radians(b.lng - a.lng);
  const arc = Math.sin(latitude / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(longitude / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(arc)) * 10) / 10;
}

export function etaMinutes(a, b, kind) {
  const speed = kind === "ambulance" ? 30 : 25;
  return Math.round((distanceKm(a, b) / speed) * 60);
}

export async function getAvailableResources({ kind, capability } = {}) {
  return resources.filter((resource) => resource.status === "available" && (!kind || resource.kind === kind) && (!capability || resource.capabilities.includes(capability)));
}

export async function findNearestAvailable({ location, capability, limit = 3 }) {
  const available = await getAvailableResources({ capability });
  return available
    .filter((resource) => !resource.capacity)
    .map((resource) => ({ resource, distanceKm: distanceKm(location, resource.location), etaMinutes: etaMinutes(location, resource.location, resource.kind) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export async function findNearestWithCapacity({ location, kind, needed }) {
  const available = await getAvailableResources({ kind });
  return available
    .filter((resource) => resource.capacity && resource.capacity.total - resource.capacity.used >= needed)
    .map((resource) => ({ resource, distanceKm: distanceKm(location, resource.location), free: resource.capacity.total - resource.capacity.used }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function detectDuplicates() {
  return [];
}

export async function validateAssignments(assignments) {
  const used = new Set();
  const conflicts = [];
  for (const assignment of assignments) {
    const resource = resources.find((item) => item.id === assignment.resourceId);
    if (!resource || resource.status !== "available" || used.has(assignment.resourceId)) {
      conflicts.push({ resourceId: assignment.resourceId, reason: !resource ? "Resource not found" : used.has(assignment.resourceId) ? "Resource assigned more than once" : "Resource unavailable" });
    }
    used.add(assignment.resourceId);
  }
  return { valid: conflicts.length === 0, conflicts };
}
