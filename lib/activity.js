// Writing to the History log. Logging must never break the action it describes, so errors are swallowed.
import { Activity } from "@/lib/db";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth";

// Who is acting: the signed-in dispatcher's name, or "Dispatcher" when sign-in is off.
export async function actorFrom(request) {
  const session = await readSessionToken(request?.cookies?.get(SESSION_COOKIE)?.value);
  return session?.name ?? "Dispatcher";
}

export async function logActivity({ type, message, actor = "System", incidentIds = [], resourceId = null, planVersion = null }) {
  try {
    await Activity.create({ type, message, actor, incidentIds: incidentIds.filter(Boolean).map(String), resourceId, planVersion });
  } catch (error) {
    console.error("could not write activity:", error.message);
  }
}

// "🚑 KA 01 AM 4821 (AMB-01)" — how a vehicle is named in messages.
export function unitName(unit) {
  if (!unit) return "a unit";
  const label = { ambulance: "Ambulance", fire_unit: "Fire truck", rescue_team: "Rescue team", hospital: "Hospital", shelter: "Shelter" }[unit.kind] ?? "Unit";
  return unit.vehicleNumber ? `${label} ${unit.vehicleNumber} (${unit.code})` : `${label} ${unit.code}`;
}

export function incidentName(incident) {
  if (!incident) return "an emergency";
  const type = { fire: "Fire", flood: "Flood", collapse: "Building collapse", accident: "Road accident", medical: "Medical emergency", other: "Emergency" }[incident.type] ?? "Emergency";
  return `${type} in ${incident.location?.area ?? "Bengaluru"} (${incident.code})`;
}
