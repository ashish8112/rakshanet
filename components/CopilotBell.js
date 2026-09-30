// The co-pilot: watches the live data and warns the dispatcher before things go wrong.
// Plain rules on real data (no guessing), so every alert can be explained and checked.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { distanceKm } from "@/components/geo";
import { UNIT_KINDS, isMobileUnit, typeLabel, unitTitle } from "@/components/labels";

const SILENT_MINUTES = 20; // a crew on its way this long without a word gets a check-in reminder
const CLUSTER_KM = 3;
const CLUSTER_MINUTES = 60;

export function copilotAlerts({ incidents, resources, plan }, now = Date.now()) {
  const alerts = [];
  const open = incidents.filter((i) => i.status !== "resolved");
  const incidentsById = new Map(incidents.map((i) => [i.id, i]));

  for (const incident of open.filter((i) => i.status === "needs_info")) {
    alerts.push({ id: `ask-${incident.id}`, level: "amber", icon: "🤔", href: "/", title: `The AI needs your answer: ${typeLabel(incident.type)} in ${incident.location.area}`, text: incident.followUpQuestions?.at(-1) ?? "" });
  }
  if (plan?.status === "proposed") {
    alerts.push({ id: `plan-${plan.id}`, level: "blue", icon: "✨", href: "/", title: `Plan ${plan.version} is waiting for your approval`, text: "Nothing is sent until you approve it." });
  }
  for (const kind of ["ambulance", "fire_unit", "rescue_team"]) {
    const all = resources.filter((r) => r.kind === kind);
    const free = all.filter((r) => r.status === "available").length;
    if (all.length > 0 && free === 0) {
      alerts.push({ id: `none-${kind}`, level: "red", icon: UNIT_KINDS[kind].icon, href: "/fleet", title: `No ${UNIT_KINDS[kind].plural.toLowerCase()} are free`, text: "New emergencies that need one will have to wait. Consider asking a neighbouring district." });
    }
  }
  for (const place of resources.filter((r) => r.capacity)) {
    const free = place.capacity.total - place.capacity.used;
    if (free <= 5 || place.capacity.used / place.capacity.total >= 0.9) {
      alerts.push({ id: `full-${place.id}`, level: free <= 0 ? "red" : "amber", icon: UNIT_KINDS[place.kind].icon, href: "/fleet", title: `${place.name.replace(" (demo)", "")} is almost full`, text: `${Math.max(free, 0)} of ${place.capacity.total} ${place.kind === "hospital" ? "beds" : "places"} left.` });
    }
  }
  for (const unit of resources.filter((r) => isMobileUnit(r.kind) && ["reserved", "en_route"].includes(r.status))) {
    const minutes = Math.round((now - new Date(unit.updatedAt).getTime()) / 60000);
    if (minutes >= SILENT_MINUTES) {
      const job = incidentsById.get(unit.assignedIncident);
      alerts.push({ id: `silent-${unit.id}`, level: "amber", icon: "📻", href: "/fleet", title: `${unitTitle(unit)} has not reported for ${minutes} min`, text: job ? `On its way to ${typeLabel(job.type).toLowerCase()} in ${job.location.area}. Check in on the radio.` : "Check in on the radio." });
    }
  }
  // Several emergencies of the same kind close together in a short time: maybe one bigger event.
  const seen = new Set();
  for (const a of open) {
    if (seen.has(a.id)) continue;
    const near = open.filter((b) => b.type === a.type && distanceKm(a.location, b.location) <= CLUSTER_KM &&
      Math.abs(new Date(a.reportedAt) - new Date(b.reportedAt)) <= CLUSTER_MINUTES * 60000);
    if (near.length >= 3) {
      near.forEach((n) => seen.add(n.id));
      alerts.push({ id: `cluster-${a.id}`, level: "amber", icon: "🧭", href: "/", title: `${near.length} ${typeLabel(a.type).toLowerCase()} reports close together near ${a.location.area}`, text: "They may be one bigger event, or duplicates. Check before sending more units." });
    }
  }
  return alerts;
}

const LEVEL = {
  red: "bg-red-50 ring-red-200",
  amber: "bg-amber-50 ring-amber-200",
  blue: "bg-blue-50 ring-blue-200",
};

export default function CopilotBell({ data }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const box = useRef(null);
  const alerts = copilotAlerts(data, now);
  const urgent = alerts.some((a) => a.level === "red");

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Co-pilot alerts"
        className={`relative rounded-xl px-3 py-2 text-sm font-medium transition ${alerts.length ? "text-slate-800 hover:bg-slate-100" : "text-slate-500 hover:bg-slate-100"}`}>
        🔔<span className="hidden sm:inline"> Co-pilot</span>
        {alerts.length > 0 && (
          <span className={`absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white ${urgent ? "bg-red-600" : "bg-amber-500"}`}>
            {alerts.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-[1500] w-[min(92vw,380px)] rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-slate-200">
          <p className="px-1 pb-2 text-sm font-semibold text-slate-900">Co-pilot <span className="font-normal text-slate-400">· watching the city for you</span></p>
          {alerts.length === 0 ? (
            <p className="px-1 py-4 text-center text-sm text-slate-500">✓ Nothing needs your attention right now.</p>
          ) : (
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
              {alerts.map((a) => (
                <li key={a.id}>
                  <Link href={a.href} onClick={() => setOpen(false)} className={`flex gap-3 rounded-xl p-3 ring-1 ring-inset transition hover:brightness-95 ${LEVEL[a.level]}`}>
                    <span className="text-lg">{a.icon}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900">{a.title}</span>
                      {a.text && <span className="block text-xs leading-relaxed text-slate-600">{a.text}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
