// Manual mode: the dispatcher plans without the AI. Pick the emergency, (optionally) say how serious it is
// and what it needs, tick the vehicles to send (nearest first), optionally a hospital or shelter, and send.
// Distances and times use the same map calculation as the AI's tools; sending goes through the same safety check.
"use client";

import { useState } from "react";
import { dispatchPlan, manualPlan, updateIncident } from "@/components/api";
import { distanceKm, etaMinutes } from "@/components/geo";
import { UNIT_KINDS, isClosed, isMobileUnit, severityInfo, typeIcon, typeLabel, unitIcon, unitSubtitle, unitTitle } from "@/components/labels";
import { Button, EmptyState, ErrorNote, Pill } from "@/components/ui";

const SEVERITIES = [[5, "Critical"], [4, "Serious"], [3, "Moderate"], [1, "Minor"]];
const NEEDS = [["medical", "🩺 Medical"], ["fire", "🔥 Fire"], ["rescue", "🦺 Rescue"], ["beds", "🏥 Hospital beds"], ["shelter", "🏠 Shelter"]];
const KIND_FILTERS = [["all", "All"], ["ambulance", "🚑"], ["fire_unit", "🚒"], ["rescue_team", "🦺"]];

function IncidentSettings({ incident, onSaved }) {
  const [severity, setSeverity] = useState(incident.severity ?? null);
  const [needs, setNeeds] = useState(incident.requiredCapabilities ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changed = severity !== (incident.severity ?? null) || needs.slice().sort().join() !== (incident.requiredCapabilities ?? []).slice().sort().join();

  const save = async () => {
    setBusy(true);
    setError("");
    const res = await updateIncident(incident.id, { ...(severity ? { severity } : {}), requiredCapabilities: needs });
    setBusy(false);
    if (!res.ok) return setError(res.error?.message ?? "Could not save.");
    onSaved();
  };

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">How serious? (you decide)</p>
        <div className="flex flex-wrap gap-1.5">
          {SEVERITIES.map(([value, label]) => (
            <button key={value} onClick={() => setSeverity(value)}
              className={`rounded-full px-3 py-1 text-sm ring-1 transition ${severity === value ? "font-semibold ring-2" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300"}`}
              style={severity === value ? { color: severityInfo(value).color, boxShadow: `inset 0 0 0 2px ${severityInfo(value).color}` } : undefined}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">What does it need?</p>
        <div className="flex flex-wrap gap-1.5">
          {NEEDS.map(([value, label]) => {
            const on = needs.includes(value);
            return (
              <button key={value} onClick={() => setNeeds((list) => (on ? list.filter((n) => n !== value) : [...list, value]))}
                className={`rounded-full px-3 py-1 text-sm ring-1 transition ${on ? "bg-blue-50 font-semibold text-blue-800 ring-blue-400" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300"}`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <ErrorNote message={error} />
      {changed && <Button size="sm" variant="secondary" onClick={save} loading={busy}>Save</Button>}
    </div>
  );
}

export default function ManualTab({ incidents, resources, selectedId, onSelect, onChanged }) {
  const open = incidents.filter((i) => !isClosed(i.status)).sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
  const incident = open.find((i) => i.id === selectedId) ?? null;
  const [picked, setPicked] = useState(() => new Set());
  const [destinationId, setDestinationId] = useState(null);
  const [kind, setKind] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [forIncident, setForIncident] = useState(selectedId);

  // A different emergency chosen: start a fresh selection.
  if (forIncident !== selectedId) {
    setForIncident(selectedId);
    setPicked(new Set());
    setDestinationId(null);
    setError("");
    setSent("");
  }

  if (open.length === 0) {
    return <EmptyState icon="🌤️" title="No open emergencies">Add one with New emergency, then choose the vehicles here.</EmptyState>;
  }

  const unitsById = new Map(resources.map((r) => [r.id, r]));
  const already = incident ? (incident.assignedResources ?? []).map((id) => unitsById.get(id)).filter(Boolean) : [];
  const needs = incident?.requiredCapabilities ?? [];
  const free = incident
    ? resources
      .filter((r) => isMobileUnit(r.kind) && r.status === "available" && (kind === "all" || r.kind === kind))
      .map((r) => ({ unit: r, km: distanceKm(r.location, incident.location), min: etaMinutes(r.location, incident.location, r.kind), fits: r.capabilities.some((c) => needs.includes(c)) }))
      .sort((a, b) => a.km - b.km)
    : [];
  const places = incident
    ? resources.filter((r) => r.capacity && r.capacity.total - r.capacity.used > 0)
      .map((r) => ({ place: r, km: distanceKm(r.location, incident.location), free: r.capacity.total - r.capacity.used }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 6)
    : [];

  const toggle = (id) => setPicked((set) => { const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const send = async () => {
    setBusy(true);
    setError("");
    const made = await manualPlan({ incidentId: incident.id, resourceIds: [...picked], destinationId });
    if (!made.ok) { setBusy(false); return setError(made.error?.message ?? "Could not send."); }
    const res = await dispatchPlan(made.data.id);
    setBusy(false);
    if (!res.ok || !res.data.committed) {
      onChanged();
      return setError(res.ok ? `Could not send: ${res.data.conflicts.map((c) => c.reason).join("; ")}. Refreshing the list — choose again.` : res.error?.message ?? "Could not send.");
    }
    setSent(`${picked.size} vehicle${picked.size === 1 ? "" : "s"} sent to ${typeLabel(incident.type).toLowerCase()} in ${incident.location.area}.`);
    setPicked(new Set());
    setDestinationId(null);
    onChanged();
  };

  return (
    <div className="space-y-4 p-5">
      <div className="rounded-2xl bg-slate-100 p-3 text-sm text-slate-600">
        ✋ <span className="font-medium text-slate-800">Manual mode:</span> you choose everything. No AI is used. Distances and times come from the map.
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">1. Which emergency?</span>
        <select value={incident?.id ?? ""} onChange={(e) => onSelect(e.target.value || null)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500">
          <option value="">Choose an emergency…</option>
          {open.map((i) => <option key={i.id} value={i.id}>{typeLabel(i.type)} in {i.location.area} ({i.code})</option>)}
        </select>
      </label>

      {incident && (
        <>
          <div className="flex items-start gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-slate-200">
            <span className="text-2xl">{typeIcon(incident.type)}</span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-slate-900">{typeLabel(incident.type)} in {incident.location.area}</p>
              <p className="line-clamp-2 text-slate-600">{incident.description}</p>
              {incident.peopleAffected != null && <p className="text-xs text-slate-400">👥 {incident.peopleAffected} people</p>}
            </div>
          </div>

          <IncidentSettings key={incident.id} incident={incident} onSaved={onChanged} />

          {already.length > 0 && (
            <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-inset ring-emerald-200">
              Already sent: {already.map((u) => `${unitIcon(u.kind)} ${unitTitle(u)}`).join(", ")}
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">2. Choose vehicles (nearest first)</span>
              <div className="flex gap-1">
                {KIND_FILTERS.map(([value, label]) => (
                  <button key={value} onClick={() => setKind(value)}
                    className={`rounded-lg px-2 py-1 text-sm ${kind === value ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "text-slate-500 hover:bg-slate-100"}`}>{label}</button>
                ))}
              </div>
            </div>
            {free.length === 0 ? (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">No free vehicles of this kind. Check the Fleet page for vehicles that could come back into service.</p>
            ) : (
              <ul className="space-y-2">
                {free.slice(0, 12).map(({ unit, km, min, fits }) => {
                  const on = picked.has(unit.id);
                  return (
                    <li key={unit.id}>
                      <button onClick={() => toggle(unit.id)}
                        className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ring-1 transition ${on ? "bg-blue-50 ring-2 ring-blue-500" : "bg-white ring-slate-200 hover:ring-slate-300"}`}>
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"}`}>{on ? "✓" : ""}</span>
                        <span className="text-xl">{unitIcon(unit.kind)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-sm font-semibold tracking-wide text-slate-900">{unitTitle(unit)}</span>
                          <span className="block truncate text-xs text-slate-500">{unitSubtitle(unit)}</span>
                        </span>
                        <span className="shrink-0 text-right text-xs">
                          <span className="block font-semibold text-slate-800">{min} min</span>
                          <span className="block text-slate-400">{km} km</span>
                        </span>
                        {needs.length > 0 && fits && <Pill tone="green">fits</Pill>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {places.length > 0 && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">3. Take people to (optional)</span>
              <select value={destinationId ?? ""} onChange={(e) => setDestinationId(e.target.value || null)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                <option value="">Nowhere / decide later</option>
                {places.map(({ place, km, free: spaces }) => (
                  <option key={place.id} value={place.id}>{UNIT_KINDS[place.kind].icon} {place.name.replace(" (demo)", "")} · {spaces} free · {km} km</option>
                ))}
              </select>
            </label>
          )}

          <ErrorNote message={error} />
          {sent && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">✓ {sent}</p>}
          <div className="sticky bottom-0 -mx-5 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
            <Button size="lg" variant="success" className="w-full" onClick={send} loading={busy} disabled={picked.size === 0}>
              🚀 Send {picked.size || ""} vehicle{picked.size === 1 ? "" : "s"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
