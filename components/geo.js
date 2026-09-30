// Owner: Daksh
// Client-side Geo & ETA utilities matching CONTRACT.md 5.3 specifications

const EARTH_RADIUS_KM = 6371;
const CITY_SPEED_KMH = {
  ambulance: 30,
  fire_unit: 25,
  rescue_team: 25,
};

export function distanceKm(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(b.lat)) return 0;
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const dist = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, haversine)));
  return Math.round(dist * 10) / 10;
}

export function etaMinutes(a, b, kind = "ambulance") {
  const speed = CITY_SPEED_KMH[kind] || 30;
  const dist = distanceKm(a, b);
  return Math.max(2, Math.ceil((dist / speed) * 60));
}

export function getNearestResponders(targetLocation, resources = []) {
  if (!targetLocation || !targetLocation.lat || !targetLocation.lng) return [];

  const available = resources.filter(
    (r) =>
      (r.status === "available" || r.status === "reserved") &&
      ["ambulance", "fire_unit", "rescue_team"].includes(r.kind) &&
      r.location?.lat &&
      r.location?.lng
  );

  return available
    .map((res) => {
      const dist = distanceKm(targetLocation, res.location);
      const eta = etaMinutes(targetLocation, res.location, res.kind);
      return {
        resource: res,
        distanceKm: dist,
        etaMinutes: eta,
      };
    })
    .sort((a, b) => a.etaMinutes - b.etaMinutes);
}

export const BENGALURU_HUBS = [
  { name: "Koramangala", lat: 12.9352, lng: 77.6245 },
  { name: "Indiranagar", lat: 12.9719, lng: 77.6412 },
  { name: "HSR Layout", lat: 12.9141, lng: 77.6387 },
  { name: "Whitefield", lat: 12.9698, lng: 77.7499 },
  { name: "Domlur", lat: 12.9609, lng: 77.6387 },
  { name: "MG Road / CBD", lat: 12.9716, lng: 77.5946 },
  { name: "Majestic", lat: 12.9767, lng: 77.5713 },
  { name: "BTM Layout", lat: 12.9165, lng: 77.6101 },
  { name: "Jayanagar", lat: 12.925, lng: 77.5938 },
  { name: "Electronic City", lat: 12.8452, lng: 77.6602 },
  { name: "Hebbal", lat: 13.0358, lng: 77.597 },
  { name: "Bellandur", lat: 12.926, lng: 77.6762 },
  { name: "Marathahalli", lat: 12.9591, lng: 77.6974 },
  { name: "Rajajinagar", lat: 12.9915, lng: 77.5528 },
  { name: "Yelahanka", lat: 13.1007, lng: 77.5963 },
];

export function getAreaName(coords) {
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
    return "Bengaluru";
  }
  let closest = BENGALURU_HUBS[0];
  let minD = distanceKm(coords, closest);
  for (const hub of BENGALURU_HUBS) {
    const d = distanceKm(coords, hub);
    if (d < minD) {
      minD = d;
      closest = hub;
    }
  }
  if (minD <= 1.2) {
    return closest.name;
  } else if (minD <= 4.0) {
    return `Near ${closest.name} (~${minD} km)`;
  }
  return `Bengaluru (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
}

