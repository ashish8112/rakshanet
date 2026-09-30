// Plain-language words, colours and icons used everywhere in the UI,
// so a non-technical dispatcher never has to read codes like "sev 4" or "needs_info".

export const INCIDENT_TYPES = {
  fire: { label: "Fire", icon: "🔥" },
  flood: { label: "Flood", icon: "🌊" },
  collapse: { label: "Building collapse", icon: "🏚️" },
  accident: { label: "Road accident", icon: "🚗" },
  medical: { label: "Medical emergency", icon: "🩺" },
  other: { label: "Something else", icon: "❓" },
};

export const typeLabel = (type) => INCIDENT_TYPES[type]?.label ?? "Emergency";
export const typeIcon = (type) => INCIDENT_TYPES[type]?.icon ?? "❗";

// Severity 1-5 from the AI, shown as words and colours.
export function severityInfo(severity) {
  if (severity >= 5) return { label: "Critical", tone: "red", color: "#dc2626" };
  if (severity === 4) return { label: "Serious", tone: "orange", color: "#ea580c" };
  if (severity === 3) return { label: "Moderate", tone: "amber", color: "#d97706" };
  if (severity >= 1) return { label: "Minor", tone: "blue", color: "#2563eb" };
  return { label: "Not assessed yet", tone: "gray", color: "#64748b" };
}

// Incident status, as the dispatcher would say it.
export function incidentStatusInfo(status) {
  switch (status) {
    case "new":
    case "assessing":
      return { label: "Waiting for a plan", tone: "gray" };
    case "needs_info":
      return { label: "Needs your answer", tone: "amber" };
    case "planned":
      return { label: "Plan ready to approve", tone: "blue" };
    case "dispatched":
      return { label: "Help on the way", tone: "green" };
    case "resolved":
      return { label: "Resolved", tone: "muted" };
    default:
      return { label: status ?? "", tone: "gray" };
  }
}

export const UNIT_KINDS = {
  ambulance: { label: "Ambulance", plural: "Ambulances", icon: "🚑" },
  fire_unit: { label: "Fire truck", plural: "Fire trucks", icon: "🚒" },
  rescue_team: { label: "Rescue team", plural: "Rescue teams", icon: "🦺" },
  hospital: { label: "Hospital", plural: "Hospitals", icon: "🏥" },
  shelter: { label: "Shelter", plural: "Shelters", icon: "🏠" },
};

export const unitLabel = (kind) => UNIT_KINDS[kind]?.label ?? "Unit";
export const unitIcon = (kind) => UNIT_KINDS[kind]?.icon ?? "📍";
export const isMobileUnit = (kind) => ["ambulance", "fire_unit", "rescue_team"].includes(kind);

export function unitStatusInfo(status) {
  switch (status) {
    case "available":
      return { label: "Free", tone: "green" };
    case "reserved":
    case "en_route":
      return { label: "On the way", tone: "blue" };
    case "on_scene":
      return { label: "At the scene", tone: "orange" };
    case "unavailable":
      return { label: "Out of service", tone: "muted" };
    default:
      return { label: status ?? "", tone: "gray" };
  }
}

// Tailwind classes for the small coloured pills.
export const TONE_CLASSES = {
  red: "bg-red-50 text-red-700 ring-red-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  gray: "bg-slate-100 text-slate-600 ring-slate-200",
  muted: "bg-slate-50 text-slate-400 ring-slate-200",
};

// "12 min ago" style times.
export function timeAgo(iso) {
  if (!iso) return "";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : new Date(iso).toLocaleDateString();
}

// Friendly names for the four agents in the activity timeline.
export const AGENT_INFO = {
  orchestrator: { label: "Coordinator", icon: "🧭" },
  incident_assessment: { label: "Understanding the emergency", icon: "🔎" },
  route_logistics: { label: "Finding the nearest units", icon: "🗺️" },
  resource_allocation: { label: "Deciding who goes where", icon: "🧩" },
  command_planning: { label: "Writing the plan", icon: "📝" },
};
