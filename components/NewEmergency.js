// "New emergency" form: where, what, a few words, how many people. Opens as a side sheet over the map.
"use client";

import { useState } from "react";
import { createIncident } from "@/components/api";
import { BENGALURU_HUBS, distanceKm } from "@/components/geo";
import { INCIDENT_TYPES } from "@/components/labels";
import { Button, ErrorNote } from "@/components/ui";

// Name a map click after the nearest known area.
export function areaFor(location) {
  const nearest = BENGALURU_HUBS.map((hub) => ({ hub, km: distanceKm(location, hub) })).sort((a, b) => a.km - b.km)[0];
  return nearest && nearest.km <= 4 ? nearest.hub.name : "Bengaluru";
}

export default function NewEmergency({ location, onChooseOnMap, onChooseArea, onClose, onCreated }) {
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [people, setPeople] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ready = location && type && description.trim();

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const res = await createIncident({
      type,
      description: description.trim(),
      location,
      peopleAffected: people === "" ? null : Number(people),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error?.message ?? "Could not save the emergency.");
    onCreated(res.data);
  };

  return (
    <form onSubmit={submit} className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">New emergency</h2>
          <p className="text-sm text-slate-500">Fill this in while you are on the call.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">✕</button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <section>
          <p className="mb-2 text-sm font-semibold text-slate-800">1. Where is it?</p>
          {location ? (
            <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 ring-1 ring-inset ring-blue-200">
              <span className="font-medium text-blue-900">📍 {location.area}</span>
              <button type="button" onClick={onChooseOnMap} className="text-sm font-medium text-blue-700 underline underline-offset-2">Change</button>
            </div>
          ) : (
            <Button type="button" variant="secondary" className="w-full" onClick={onChooseOnMap}>📍 Click the place on the map</Button>
          )}
          <p className="mb-2 mt-3 text-xs text-slate-400">Or pick an area:</p>
          <div className="flex flex-wrap gap-1.5">
            {BENGALURU_HUBS.map((hub) => (
              <button key={hub.name} type="button" onClick={() => onChooseArea({ lat: hub.lat, lng: hub.lng, area: hub.name })}
                className={`rounded-full px-3 py-1 text-sm transition ring-1 ${location?.area === hub.name ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300"}`}>
                {hub.name}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2 text-sm font-semibold text-slate-800">2. What happened?</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(INCIDENT_TYPES).map(([key, info]) => (
              <button key={key} type="button" onClick={() => setType(key)}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-sm transition ring-1 ${type === key ? "bg-blue-50 font-semibold text-blue-900 ring-2 ring-blue-500" : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300"}`}>
                <span className="text-2xl">{info.icon}</span>
                <span className="text-center leading-tight">{info.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">3. What did the caller say?</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="e.g. Water entering ground floor homes, 10 people stuck on the first floor"
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </label>
        </section>

        <section>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">4. How many people are affected? <span className="font-normal text-slate-400">(if known)</span></span>
            <input type="number" min="0" value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Leave empty if unknown"
              className="w-40 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </label>
        </section>
      </div>

      <div className="space-y-2 border-t border-slate-200 px-5 py-4">
        <ErrorNote message={error} />
        <Button type="submit" size="lg" variant="danger" className="w-full" loading={busy} disabled={!ready}>Save emergency</Button>
        {!ready && <p className="text-center text-xs text-slate-400">Choose the place, the type and add a few words.</p>}
      </div>
    </form>
  );
}
