// "New emergency" form: where, what, a few words, how many people. Opens as a side sheet over the map.
"use client";

import { useEffect, useState } from "react";
import { createIncident, readCall, searchPlaces } from "@/components/api";
import { BENGALURU_HUBS, distanceKm } from "@/components/geo";
import { INCIDENT_TYPES } from "@/components/labels";
import { Button, ErrorNote } from "@/components/ui";

// Name a map click after the nearest known area.
export function areaFor(location) {
  const nearest = BENGALURU_HUBS.map((hub) => ({ hub, km: distanceKm(location, hub) })).sort((a, b) => a.km - b.km)[0];
  return nearest && nearest.km <= 4 ? nearest.hub.name : "Bengaluru";
}

// Type a landmark, street or area. Known areas match instantly; OpenStreetMap results follow after a short pause.
export function PlaceSearch({ onPick, placeholder = "Type a place, e.g. Kristu Jayanti University", autoFocus = true, initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [online, setOnline] = useState({ query: "", places: [], error: "" });
  const [searching, setSearching] = useState(false);
  const q = query.trim();

  useEffect(() => {
    if (q.length < 3) return undefined;
    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await searchPlaces(q);
      setOnline({ query: q, places: res.ok ? res.data : [], error: res.ok ? "" : res.error?.message ?? "Search failed." });
      setSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [q]);

  const areas = q.length >= 2
    ? BENGALURU_HUBS.filter((hub) => hub.name.toLowerCase().includes(q.toLowerCase())).map((hub) => ({ label: hub.name, lat: hub.lat, lng: hub.lng, kind: "Area" }))
    : [];
  const places = online.query === q ? online.places.map((p) => ({ label: p.label, lat: p.lat, lng: p.lng, kind: "Place" })) : [];
  const results = [...areas, ...places.filter((p) => !areas.some((a) => a.label === p.label))];
  const showList = q.length >= 2;

  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
        {searching && <span className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />}
      </div>
      {showList && (
        <ul className="mt-2 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          {results.map((r) => (
            <li key={`${r.kind}-${r.label}-${r.lat}`}>
              <button type="button" onClick={() => onPick({ lat: r.lat, lng: r.lng, area: r.label.slice(0, 80) })}
                className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-slate-50">
                <span>{r.kind === "Area" ? "🏙️" : "📍"}</span>
                <span className="min-w-0 flex-1 text-slate-800">{r.label}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">
              {searching || (q.length >= 3 && online.query !== q) ? "Searching…" : online.error || (q.length < 3 ? "Keep typing…" : "No places found. Try a nearby landmark or click the map.")}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// Speech languages offered for dictation (browser speech recognition, no extra service).
const SPEECH_LANGS = [["en-IN", "English"], ["hi-IN", "हिन्दी"], ["kn-IN", "ಕನ್ನಡ"]];

// "Quick fill": speak or paste what the caller says, and the AI fills in the form.
function QuickFill({ onFilled }) {
  const [text, setText] = useState("");
  const [lang, setLang] = useState("en-IN");
  const [listening, setListening] = useState(null); // the running SpeechRecognition, if any
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canListen = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggleMic = () => {
    if (listening) {
      listening.stop();
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Recognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    const before = text ? `${text} ` : "";
    rec.onresult = (event) => {
      let heard = "";
      for (let i = 0; i < event.results.length; i += 1) heard += event.results[i][0].transcript;
      setText(before + heard);
    };
    rec.onerror = (event) => setError(event.error === "not-allowed" ? "Allow the microphone in your browser to dictate." : "Could not hear clearly. Try again or type it.");
    rec.onend = () => setListening(null);
    setError("");
    rec.start();
    setListening(rec);
  };

  const fill = async () => {
    listening?.stop();
    setBusy(true);
    setError("");
    const res = await readCall(text);
    setBusy(false);
    if (!res.ok) return setError(res.error?.message ?? "Could not read the call.");
    onFilled(res.data);
  };

  return (
    <section className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 ring-1 ring-inset ring-blue-200">
      <p className="text-sm font-semibold text-blue-950">⚡ Quick fill with AI</p>
      <p className="mb-2.5 text-xs text-blue-900/80">Speak or paste what the caller says — English, Hindi or Kannada. The AI fills in the form; you check it.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
        placeholder="e.g. Kristu Jayanti college hostel mein aag lagi hai, 40 students bahar aa rahe hain"
        className="w-full resize-none rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {canListen && (
          <>
            <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={Boolean(listening)}
              className="rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-sm outline-none">
              {SPEECH_LANGS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
            <Button type="button" size="sm" variant={listening ? "danger" : "secondary"} onClick={toggleMic}>
              {listening ? "■ Stop" : "🎙️ Speak"}
            </Button>
          </>
        )}
        <Button type="button" size="sm" className="ml-auto" onClick={fill} loading={busy} disabled={text.trim().length < 5}>✨ Fill the form</Button>
      </div>
      {listening && <p className="mt-2 flex items-center gap-2 text-xs text-red-700"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Listening… speak now</p>}
      <ErrorNote message={error} />
    </section>
  );
}

export default function NewEmergency({ location, onChooseOnMap, onChooseArea, onClose, onCreated }) {
  const [type, setType] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [aiNote, setAiNote] = useState(null); // what Quick fill understood, shown for checking
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
        <QuickFill onFilled={(result) => {
          setType(result.type);
          setDescription(result.description);
          if (result.peopleAffected != null) setPeople(String(result.peopleAffected));
          if (result.placeQuery) { setPlaceQuery(result.placeQuery); onChooseArea(null); }
          setAiNote(result);
        }} />
        {aiNote && (
          <div className="rounded-xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
            <p className="font-medium text-slate-800">✓ Filled in by {aiNote.source === "ai" ? `the AI (from ${aiNote.language})` : "keyword rules (AI busy)"} — please check below.</p>
            {aiNote.placeQuery && <p className="mt-0.5">Place heard: “{aiNote.placeQuery}” — pick the right match.</p>}
            {aiNote.missing?.length > 0 && <p className="mt-0.5">Also ask the caller: {aiNote.missing.join(" · ")}</p>}
          </div>
        )}
        <section>
          <p className="mb-2 text-sm font-semibold text-slate-800">1. Where is it?</p>
          {location ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-blue-50 px-4 py-3 ring-1 ring-inset ring-blue-200">
              <span className="min-w-0 font-medium text-blue-900">📍 {location.area}</span>
              <button type="button" onClick={() => onChooseArea(null)} className="shrink-0 text-sm font-medium text-blue-700 underline underline-offset-2">Change</button>
            </div>
          ) : (
            <>
              <PlaceSearch key={placeQuery} initialQuery={placeQuery} onPick={onChooseArea} />
              <button type="button" onClick={onChooseOnMap} className="mt-2 text-sm font-medium text-blue-700 underline underline-offset-2">
                or click the place on the map
              </button>
              <p className="mb-2 mt-4 text-xs text-slate-400">Or pick an area:</p>
              <div className="flex flex-wrap gap-1.5">
                {BENGALURU_HUBS.map((hub) => (
                  <button key={hub.name} type="button" onClick={() => onChooseArea({ lat: hub.lat, lng: hub.lng, area: hub.name })}
                    className="rounded-full bg-white px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200 transition hover:ring-slate-300">
                    {hub.name}
                  </button>
                ))}
              </div>
            </>
          )}
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
