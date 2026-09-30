// Right panel, "Units" tab: what every unit is doing, and buttons for what the crew reports by radio.
"use client";

import { useState } from "react";
import { updateResponder } from "@/components/api";
import { typeLabel, unitIcon, unitLabel, unitStatusInfo, isMobileUnit } from "@/components/labels";
import { Button, ErrorNote, Pill } from "@/components/ui";

// Buttons offered for each unit status, in the crew's words.
function actionsFor(status) {
  switch (status) {
    case "reserved":
    case "en_route":
      return [["arrived", "Arrived", "secondary"], ["unavailable", "Broke down", "ghost"]];
    case "on_scene":
      return [["cleared", "Job done", "success"], ["unavailable", "Broke down", "ghost"]];
    case "available":
      return [["unavailable", "Out of service", "ghost"]];
    case "unavailable":
      return [["available", "Back in service", "secondary"]];
    default:
      return [];
  }
}

const GROUPS = [
  { title: "On a job", statuses: ["reserved", "en_route", "on_scene"] },
  { title: "Free", statuses: ["available"] },
  { title: "Out of service", statuses: ["unavailable"] },
];

export default function UnitsTab({ resources, incidents, onChanged, onAskAI }) {
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const incidentsById = new Map(incidents.map((i) => [i.id, i]));
  const units = resources.filter((r) => isMobileUnit(r.kind));
  const places = resources.filter((r) => !isMobileUnit(r.kind));

  const report = async (unit, event, label) => {
    setBusyId(unit.id);
    setError("");
    setMessage("");
    const res = await updateResponder(unit.id, event);
    setBusyId("");
    if (!res.ok) return setError(res.error?.message ?? "Could not save the update.");
    onChanged();
    // A unit lost on the way leaves its emergency short: re-plan straight away.
    if (event === "unavailable" && res.data.affectedIncidentIds.length > 0) {
      setMessage(`${unit.code} marked as broken down. The AI is finding a replacement.`);
      return onAskAI({ trigger: "responder_update", resourceId: unit.id });
    }
    setMessage(`${unit.code}: ${label.toLowerCase()} saved.`);
  };

  return (
    <div className="space-y-5 p-5">
      <p className="text-sm text-slate-500">When a crew calls in on the radio, press the matching button.</p>
      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">{message}</p>}
      <ErrorNote message={error} />

      {GROUPS.map((group) => {
        const list = units.filter((u) => group.statuses.includes(u.status));
        if (list.length === 0) return null;
        return (
          <div key={group.title}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">{group.title} · {list.length}</h3>
            <ul className="space-y-2">
              {list.map((unit) => {
                const status = unitStatusInfo(unit.status);
                const job = unit.assignedIncident && incidentsById.get(unit.assignedIncident);
                return (
                  <li key={unit.id} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-xl ring-1 ring-slate-200">{unitIcon(unit.kind)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{unit.code} <span className="font-normal text-slate-500">{unitLabel(unit.kind)}</span></p>
                        <p className="truncate text-xs text-slate-500">
                          {job ? `${typeLabel(job.type)} in ${job.location.area}` : `Based in ${unit.location.area}`}
                        </p>
                      </div>
                      <Pill tone={status.tone}>{status.label}</Pill>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {actionsFor(unit.status).map(([event, label, variant]) => (
                        <Button key={event} size="sm" variant={variant} loading={busyId === unit.id} onClick={() => report(unit, event, label)}>
                          {label}
                        </Button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Hospitals &amp; shelters</h3>
        <ul className="space-y-2">
          {places.map((place) => {
            const free = place.capacity ? place.capacity.total - place.capacity.used : 0;
            const pct = place.capacity ? Math.round((place.capacity.used / place.capacity.total) * 100) : 0;
            return (
              <li key={place.id} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">{unitIcon(place.kind)} {place.code} <span className="font-normal text-slate-500">{place.location.area}</span></span>
                  <span className={free <= 5 ? "font-semibold text-red-600" : "text-slate-600"}>{free} free</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
