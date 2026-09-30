// Route and Logistics agent: the "tool user". No Gemini here on purpose:
// every distance, ETA and free-bed number comes from Sam's tools (lib/tools).
import { findNearestAvailable, findNearestWithCapacity } from "@/lib/tools";

const MOBILE = ["medical", "fire", "rescue"];
const DESTINATION_KIND = { beds: "hospital", shelter: "shelter" };
const CANDIDATES_PER_CAPABILITY = 3;
const DESTINATION_OPTIONS = 3;

// Returns CONTRACT.md 5.4 route_logistics output for one incident, plus `details`
// (resource code, kind, capabilities) that the next agents need to reason with.
export async function planRoutes(incident) {
  const incidentId = String(incident.id);
  const candidates = new Map(); // resourceId -> candidate (a unit can match several capabilities)
  const destinations = new Map();

  for (const capability of incident.requiredCapabilities.filter((c) => MOBILE.includes(c))) {
    const nearest = await findNearestAvailable({
      location: incident.location,
      capability,
      limit: CANDIDATES_PER_CAPABILITY,
    });
    for (const { resource, distanceKm, etaMinutes } of nearest) {
      const id = String(resource.id);
      const existing = candidates.get(id);
      if (existing) {
        existing.matches.push(capability);
        continue;
      }
      candidates.set(id, {
        resourceId: id,
        distanceKm,
        etaMinutes,
        code: resource.code,
        kind: resource.kind,
        capabilities: resource.capabilities,
        matches: [capability],
      });
    }
  }

  for (const need of incident.requiredCapabilities.filter((c) => DESTINATION_KIND[c])) {
    const options = await findNearestWithCapacity({
      location: incident.location,
      kind: DESTINATION_KIND[need],
      needed: 1,
    });
    for (const { resource, distanceKm, free } of options.slice(0, DESTINATION_OPTIONS)) {
      destinations.set(String(resource.id), {
        resourceId: String(resource.id),
        distanceKm,
        free,
        code: resource.code,
        kind: resource.kind,
      });
    }
  }

  const details = { candidates: [...candidates.values()], destinationOptions: [...destinations.values()] };
  return {
    output: {
      incidentId,
      candidates: details.candidates.map(({ resourceId, distanceKm, etaMinutes }) => ({ resourceId, distanceKm, etaMinutes })),
      destinationOptions: details.destinationOptions.map(({ resourceId, distanceKm, free }) => ({ resourceId, distanceKm, free })),
    },
    details,
  };
}
