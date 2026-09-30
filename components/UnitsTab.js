// Right panel, "Units" tab: every vehicle, grouped so it is easy to scan, with the crew's radio updates as buttons.
// Updates show immediately (the saved unit comes back from the server and replaces the old one),
// and several vehicles can be updated one after another without waiting.
"use client";

import { useState } from "react";
import { addResource, removeResource, updateResponder } from "@/components/api";
import { PlaceSearch } from "@/components/NewEmergency";
import { UNIT_KINDS, isMobileUnit, typeIcon, typeLabel, unitIcon, unitLabel, unitStatusInfo, unitSubtitle, unitTitle } from "@/components/labels";
import { Button, ErrorNote, Pill } from "@/components/ui";

const MOBILE_KINDS = ["ambulance", "fire_unit", "rescue_team"];

// Buttons for each unit status, in the crew's words.
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

const countWords = (list) => MOBILE_KINDS
  .map((kind) => [kind, list.filter((u) => u.kind === kind).length])
  .filter(([, n]) => n > 0)
  .map(([kind, n]) => `${n} ${n === 1 ? UNIT_KINDS[kind].label.toLowerCase() : UNIT_KINDS[kind].plural.toLowerCase()}`)
  .join(", ");

function Section({ title, count, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl bg-white ring-1 ring-slate-200">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="font-semibold text-slate-800">{title} <span className="font-normal text-slate-400">· {count}</span></span>
        <span className={`text-slate-400 transition ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open && <div className="space-y-2 border-t border-slate-100 p-3">{children}</div>}
    </section>
  );
}

function UnitRow({ unit, pending, onReport, onRemove, showRemove }) {
  const status = unitStatusInfo(unit.status);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl ring-1 ring-slate-200">{unitIcon(unit.kind)}</span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[15px] font-semibold tracking-wide text-slate-900">{unitTitle(unit)}</p>
          <p className="truncate text-xs text-slate-500">{unitSubtitle(unit)}</p>
        </div>
        <Pill tone={status.tone}>{status.label}</Pill>
      </div>
      {confirming ? (
        <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-800">
          <span className="flex-1">Remove {unitTitle(unit)} for good?</span>
          <Button size="sm" variant="danger" loading={pending.has(`${unit.id}:remove`)} onClick={() => onRemove(unit)}>Remove</Button>
          <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>Cancel</Button>
        </div>
      ) : (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {actionsFor(unit.status).map(([event, label, variant]) => (
            <Button key={event} size="sm" variant={variant} loading={pending.has(`${unit.id}:${event}`)} onClick={() => onReport(unit, event, label)}>
              {label}
            </Button>
          ))}
          {showRemove && (
            <Button size="sm" variant="ghost" className="ml-auto text-red-600 hover:bg-red-50" onClick={() => setConfirming(true)}>Remove</Button>
          )}
        </div>
      )}
    </div>
  );
}

function AddUnitForm({ onAdded, onCancel }) {
  const [kind, setKind] = useState("ambulance");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [location, setLocation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const place = !isMobileUnit(kind);
  const ready = location && (place ? Number(capacity) > 0 : vehicleNumber.trim());

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const res = await addResource({ kind, vehicleNumber, name, location, capacity: place ? Number(capacity) : undefined });
    setBusy(false);
    if (!res.ok) return setError(res.error?.message ?? "Could not add the unit.");
    onAdded(res.data);
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl bg-white p-4 ring-2 ring-blue-200">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-900">Add a unit</p>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600" aria-label="Close">✕</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(UNIT_KINDS).map(([key, info]) => (
          <button key={key} type="button" onClick={() => setKind(key)}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 text-xs ring-1 transition ${kind === key ? "bg-blue-50 font-semibold text-blue-900 ring-2 ring-blue-500" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300"}`}>
            <span className="text-xl">{info.icon}</span>{info.label}
          </button>
        ))}
      </div>
      {place ? (
        <>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "hospital" ? "e.g. Manipal Hospital, Old Airport Road" : "e.g. Government School Relief Shelter"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">{kind === "hospital" ? "Beds" : "Places"}</span>
            <input type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 40"
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
        </>
      ) : (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Vehicle number (as written on the vehicle)</span>
          <input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())} placeholder="e.g. KA 01 AM 5521"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono tracking-wide outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </label>
      )}
      <div className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">Where is it based?</span>
        {location ? (
          <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 ring-1 ring-inset ring-blue-200">
            <span className="text-blue-900">📍 {location.area}</span>
            <button type="button" onClick={() => setLocation(null)} className="text-blue-700 underline underline-offset-2">Change</button>
          </div>
        ) : (
          <PlaceSearch onPick={setLocation} autoFocus={false} placeholder="Type the base, e.g. St. John's Hospital" />
        )}
      </div>
      <ErrorNote message={error} />
      <Button type="submit" className="w-full" loading={busy} disabled={!ready}>Add {unitLabel(kind).toLowerCase()}</Button>
    </form>
  );
}

export default function UnitsTab({ resources, incidents, onChanged, onUnitSaved, onUnitRemoved, onAskAI }) {
  const [pending, setPending] = useState(() => new Set());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const incidentsById = new Map(incidents.map((i) => [i.id, i]));
  const units = resources.filter((r) => isMobileUnit(r.kind));
  const places = resources.filter((r) => !isMobileUnit(r.kind));
  const onJob = units.filter((u) => ["reserved", "en_route", "on_scene"].includes(u.status));
  const free = units.filter((u) => u.status === "available");
  const out = units.filter((u) => u.status === "unavailable");

  const mark = (key, on) => setPending((set) => { const next = new Set(set); if (on) next.add(key); else next.delete(key); return next; });

  const report = async (unit, event, label) => {
    const key = `${unit.id}:${event}`;
    mark(key, true);
    setError("");
    const res = await updateResponder(unit.id, event);
    mark(key, false);
    if (!res.ok) return setError(`${unitTitle(unit)}: ${res.error?.message ?? "could not save the update."}`);
    onUnitSaved(res.data.resource); // shows at once
    onChanged(); // refresh emergencies and plan in the background
    if (event === "unavailable" && res.data.affectedIncidentIds.length > 0) {
      setMessage(`${unitTitle(unit)} broke down. The AI is finding a replacement.`);
      return onAskAI({ trigger: "responder_update", resourceId: unit.id });
    }
    setMessage(`${unitTitle(unit)}: ${label.toLowerCase()}.`);
  };

  const remove = async (unit) => {
    const key = `${unit.id}:remove`;
    mark(key, true);
    setError("");
    const res = await removeResource(unit.id);
    mark(key, false);
    if (!res.ok) return setError(res.error?.message ?? "Could not remove the unit.");
    onUnitRemoved(unit.id);
    setMessage(`${unitTitle(unit)} removed from the fleet.`);
  };

  // On a job: one card per emergency with its vehicles.
  const jobs = new Map();
  for (const unit of onJob) {
    const key = unit.assignedIncident ?? "unknown";
    if (!jobs.has(key)) jobs.set(key, []);
    jobs.get(key).push(unit);
  }

  const byKind = (list, showRemove) => MOBILE_KINDS.map((kind) => {
    const group = list.filter((u) => u.kind === kind);
    if (group.length === 0) return null;
    return (
      <div key={kind}>
        <p className="mb-1.5 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{UNIT_KINDS[kind].icon} {UNIT_KINDS[kind].plural} · {group.length}</p>
        <div className="space-y-2">
          {group.map((unit) => <UnitRow key={unit.id} unit={unit} pending={pending} onReport={report} onRemove={remove} showRemove={showRemove} />)}
        </div>
      </div>
    );
  });

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">When a crew calls in on the radio, press the matching button.</p>
        {!adding && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>＋ Add unit</Button>}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {MOBILE_KINDS.map((kind) => {
          const all = units.filter((u) => u.kind === kind);
          const n = all.filter((u) => u.status === "available").length;
          return (
            <div key={kind} className="rounded-xl bg-white px-2 py-2 ring-1 ring-slate-200">
              <p className="text-lg">{UNIT_KINDS[kind].icon}</p>
              <p className="text-sm"><span className={`font-bold ${n ? "text-emerald-600" : "text-red-600"}`}>{n}</span><span className="text-slate-400"> / {all.length} free</span></p>
            </div>
          );
        })}
      </div>

      {adding && (
        <AddUnitForm onCancel={() => setAdding(false)}
          onAdded={(unit) => { setAdding(false); onUnitSaved(unit); setMessage(`${unitTitle(unit)} added. The AI can use it from now on.`); }} />
      )}
      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">{message}</p>}
      <ErrorNote message={error} />

      <Section title="On a job" count={onJob.length}>
        {onJob.length === 0 && <p className="px-1 text-sm text-slate-400">No vehicles are out right now.</p>}
        {[...jobs].map(([incidentId, list]) => {
          const incident = incidentsById.get(incidentId);
          return (
            <div key={incidentId} className="rounded-2xl bg-white p-3 ring-1 ring-blue-200">
              <p className="font-medium text-slate-900">
                {incident ? `${typeIcon(incident.type)} ${typeLabel(incident.type)} in ${incident.location.area}` : "Emergency"}
              </p>
              <p className="mb-2 text-xs text-slate-500">{countWords(list)}{incident ? ` · ${incident.code}` : ""}</p>
              <div className="space-y-2">
                {list.map((unit) => <UnitRow key={unit.id} unit={unit} pending={pending} onReport={report} onRemove={remove} showRemove={false} />)}
              </div>
            </div>
          );
        })}
      </Section>

      <Section title="Free" count={free.length} defaultOpen={false}>{byKind(free, true)}</Section>
      <Section title="Out of service" count={out.length} defaultOpen={false}>
        {out.length === 0 ? <p className="px-1 text-sm text-slate-400">Every vehicle is working.</p> : byKind(out, true)}
      </Section>

      <Section title="Hospitals & shelters" count={places.length} defaultOpen={false}>
        {places.map((place) => {
          const freePlaces = place.capacity ? place.capacity.total - place.capacity.used : 0;
          const pct = place.capacity ? Math.round((place.capacity.used / place.capacity.total) * 100) : 0;
          return (
            <div key={place.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-medium text-slate-800">{unitIcon(place.kind)} {place.name.replace(" (demo)", "")}</span>
                <span className={freePlaces <= 5 ? "shrink-0 font-semibold text-red-600" : "shrink-0 text-slate-600"}>{freePlaces} free</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
              </div>
              {place.capacity?.used === 0 && (
                <button onClick={() => remove(place)} className="mt-2 text-xs text-red-600 underline underline-offset-2">Remove</button>
              )}
            </div>
          );
        })}
      </Section>
    </div>
  );
}
