import { connectDB, Incident, Resource } from "@/lib/db";

const EARTH_RADIUS_KM = 6371;
const CITY_SPEED_KMH = { ambulance: 30, fire_unit: 25, rescue_team: 25 };
const DESTINATION_KINDS = new Set(["hospital", "shelter"]);
const MOBILE_CAPABILITIES = new Set(["medical", "fire", "rescue"]);

function checkLocation(location) {
  if (
    !location ||
    !Number.isFinite(location.lat) ||
    !Number.isFinite(location.lng) ||
    Math.abs(location.lat) > 90 ||
    Math.abs(location.lng) > 180
  ) {
    throw new TypeError("Invalid location; check numeric lat and lng values.");
  }
}

function rawDistanceKm(a, b) {
  checkLocation(a);
  checkLocation(b);
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDifference = radians(b.lat - a.lat);
  const longitudeDifference = radians(b.lng - a.lng);
  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(longitudeDifference / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export function distanceKm(a, b) {
  return Math.round(rawDistanceKm(a, b) * 10) / 10;
}

export function etaMinutes(a, b, kind) {
  const speed = CITY_SPEED_KMH[kind];
  if (!speed) {
    throw new TypeError("Invalid resource kind for ETA; use ambulance, fire_unit, or rescue_team.");
  }
  return Math.ceil((rawDistanceKm(a, b) / speed) * 60);
}

export async function getAvailableResources({ kind, capability } = {}) {
  const filter = { status: "available" };
  if (kind) filter.kind = kind;
  if (capability) filter.capabilities = capability;
  await connectDB();
  return Resource.find(filter).sort({ code: 1 });
}

export async function findNearestAvailable({ location, capability, limit = 3 }) {
  checkLocation(location);
  if (!MOBILE_CAPABILITIES.has(capability)) {
    throw new TypeError("Invalid mobile capability; use medical, fire, or rescue. Use findNearestWithCapacity for beds or shelter.");
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError("Invalid limit; use a positive whole number.");
  }

  const resources = await getAvailableResources({ capability });
  return resources
    .filter((resource) => CITY_SPEED_KMH[resource.kind])
    .map((resource) => ({ resource, rawDistance: rawDistanceKm(location, resource.location) }))
    .sort((a, b) => a.rawDistance - b.rawDistance || a.resource.code.localeCompare(b.resource.code))
    .slice(0, limit)
    .map(({ resource, rawDistance }) => ({
      resource,
      distanceKm: Math.round(rawDistance * 10) / 10,
      etaMinutes: etaMinutes(location, resource.location, resource.kind),
    }));
}

export async function findNearestWithCapacity({ location, kind, needed }) {
  checkLocation(location);
  if (!DESTINATION_KINDS.has(kind)) {
    throw new TypeError("Invalid destination kind; use hospital or shelter.");
  }
  if (!Number.isInteger(needed) || needed < 1) {
    throw new TypeError("Invalid needed count; use a positive whole number.");
  }

  const resources = await getAvailableResources({ kind });
  return resources
    .map((resource) => ({
      resource,
      free: resource.capacity ? resource.capacity.total - resource.capacity.used : 0,
      rawDistance: rawDistanceKm(location, resource.location),
    }))
    .filter(({ free }) => free >= needed)
    .sort((a, b) => a.rawDistance - b.rawDistance || a.resource.code.localeCompare(b.resource.code))
    .map(({ resource, free, rawDistance }) => ({
      resource,
      distanceKm: Math.round(rawDistance * 10) / 10,
      free,
    }));
}

export async function detectDuplicates(incident) {
  checkLocation(incident?.location);
  const reportedAt = incident.reportedAt ? new Date(incident.reportedAt) : new Date();
  if (Number.isNaN(reportedAt.getTime())) {
    throw new TypeError("Invalid incident reportedAt; use an ISO date.");
  }

  const windowMs = 30 * 60 * 1000;
  await connectDB();
  const nearbyInTime = await Incident.find({
    reportedAt: {
      $gte: new Date(reportedAt.getTime() - windowMs),
      $lte: new Date(reportedAt.getTime() + windowMs),
    },
  });
  const incidentId = incident.id ? String(incident.id) : incident._id ? String(incident._id) : null;

  return nearbyInTime
    .filter((candidate) => String(candidate.id) !== incidentId)
    .map((candidate) => ({
      incidentId: String(candidate.id),
      rawDistance: rawDistanceKm(incident.location, candidate.location),
      minutesApart: Math.round(Math.abs(candidate.reportedAt - reportedAt) / 60000),
    }))
    .filter(({ rawDistance }) => rawDistance <= 0.5)
    .sort((a, b) => a.rawDistance - b.rawDistance || a.minutesApart - b.minutesApart)
    .map(({ incidentId: id, rawDistance, minutesApart }) => ({
      incidentId: id,
      distanceKm: Math.round(rawDistance * 10) / 10,
      minutesApart,
    }));
}

export async function validateAssignments(assignments) {
  if (!Array.isArray(assignments)) {
    throw new TypeError("Invalid assignments; expected an array.");
  }

  const conflicts = [];
  const seenResourceIds = new Set();
  const destinationCounts = new Map();
  const validId = (id) => /^[0-9a-fA-F]{24}$/.test(String(id ?? ""));

  for (const assignment of assignments) {
    const resourceId = String(assignment?.resourceId ?? "");
    if (!validId(resourceId) || !validId(assignment?.incidentId) || (assignment?.destinationId && !validId(assignment.destinationId))) {
      conflicts.push({ resourceId, reason: "Assignment has an invalid resource, incident, or destination id" });
      continue;
    }
    if (seenResourceIds.has(resourceId)) {
      conflicts.push({ resourceId, reason: "Resource is assigned more than once in the plan" });
    }
    seenResourceIds.add(resourceId);
    if (assignment.destinationId) {
      const destinationId = String(assignment.destinationId);
      destinationCounts.set(destinationId, (destinationCounts.get(destinationId) ?? 0) + 1);
    }
  }

  if (conflicts.length > 0) return { valid: false, conflicts };
  if (assignments.length === 0) return { valid: true, conflicts: [] };

  await connectDB();
  const resourceIds = assignments.map((assignment) => assignment.resourceId);
  const incidentIds = assignments.map((assignment) => assignment.incidentId);
  const destinationIds = [...destinationCounts.keys()];
  const [resources, incidents, destinations] = await Promise.all([
    Resource.find({ _id: { $in: resourceIds } }),
    Incident.find({ _id: { $in: incidentIds } }),
    Resource.find({ _id: { $in: destinationIds } }),
  ]);
  const resourceById = new Map(resources.map((resource) => [String(resource.id), resource]));
  const incidentById = new Map(incidents.map((incident) => [String(incident.id), incident]));
  const destinationById = new Map(destinations.map((destination) => [String(destination.id), destination]));

  for (const assignment of assignments) {
    const resourceId = String(assignment.resourceId);
    const resource = resourceById.get(resourceId);
    const incident = incidentById.get(String(assignment.incidentId));
    if (!resource || resource.status !== "available" || resource.assignedIncident) {
      conflicts.push({ resourceId, reason: "Resource is missing or no longer available" });
    } else if (!CITY_SPEED_KMH[resource.kind]) {
      conflicts.push({ resourceId, reason: "Resource is not a dispatchable unit" });
    }
    if (!incident || ["dispatched", "resolved"].includes(incident.status)) {
      conflicts.push({ resourceId, reason: "Incident is missing or already dispatched or resolved" });
    } else if (
      resource &&
      incident.requiredCapabilities.length > 0 &&
      !incident.requiredCapabilities.some((capability) => resource.capabilities.includes(capability))
    ) {
      conflicts.push({ resourceId, reason: "Resource lacks a capability required by the incident" });
    }
    if (assignment.destinationId) {
      const destination = destinationById.get(String(assignment.destinationId));
      const free = destination?.capacity ? destination.capacity.total - destination.capacity.used : 0;
      if (
        !destination ||
        !DESTINATION_KINDS.has(destination.kind) ||
        destination.status !== "available" ||
        free < destinationCounts.get(String(assignment.destinationId))
      ) {
        conflicts.push({ resourceId, reason: "Destination is missing, unavailable, or lacks capacity" });
      }
    }
  }

  return { valid: conflicts.length === 0, conflicts };
}
