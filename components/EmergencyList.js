// Left column: every emergency as a plain card. Cards that need the dispatcher's answer come first.
"use client";

import { useEffect, useState } from "react";
import { updateIncident } from "@/components/api";
import { severityInfo, incidentStatusInfo, typeIcon, typeLabel, timeAgo, unitIcon, unitTitle } from "@/components/labels";
import { arrivalText, trip, useDemoSpeed } from "@/components/movement";
import { Button, EmptyState, ErrorNote, Pill } from "@/components/ui";

function AnswerBox({ incident, onAnswered }) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async (event) => {
    event.stopPropagation();
    setBusy(true);
    setError("");
    const res = await updateIncident(incident.id, { description: `${incident.description} Update: ${answer.trim()}` });
    setBusy(false);
    if (!res.ok) return setError(res.error?.message ?? "Could not save the answer.");
    setAnswer("");
    onAnswered(incident);
  };

  return (
    <div className="mt-3 rounded-xl bg-amber-50 p-3 ring-1 ring-inset ring-amber-200" onClick={(e) => e.stopPropagation()}>
      <p className="text-sm font-medium text-amber-900">🤔 The AI needs to know:</p>
      <p className="mt-0.5 text-sm text-amber-900">{incident.followUpQuestions?.[incident.followUpQuestions.length - 1]}</p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={2}
        placeholder="Type what the caller told you..."
        className="mt-2 w-full resize-none rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
      />
      <ErrorNote message={error} />
      <Button size="sm" className="mt-2 w-full" onClick={send} loading={busy} disabled={!answer.trim()}>
        Send answer and re-plan
      </Button>
    </div>
  );
}

function EmergencyCard({ incident, incidents, units, now, speed, selected, onSelect, onAnswered }) {
  const severity = severityInfo(incident.severity);
  const status = incidentStatusInfo(incident.status);
  const duplicateOf = incident.possibleDuplicateOf && incidents.find((i) => i.id === incident.possibleDuplicateOf);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(incident.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(incident.id)}
      className={`cursor-pointer rounded-2xl bg-white p-4 transition ring-1 ${selected ? "ring-2 ring-blue-500 shadow-md" : "ring-slate-200 hover:ring-slate-300 hover:shadow-sm"} ${incident.status === "resolved" ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: `${severity.color}14` }}>
          {typeIcon(incident.type)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold leading-tight text-slate-900">
              {typeLabel(incident.type)} <span className="font-normal text-slate-500">in</span> {incident.location.area}
            </p>
            <span className="shrink-0 text-xs text-slate-400">{timeAgo(incident.reportedAt)}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Pill tone={severity.tone}>{severity.label}</Pill>
            <Pill tone={status.tone}>{status.label}</Pill>
          </div>
        </div>
      </div>
      <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-slate-600">{incident.description}</p>
      <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-slate-400">
        <span>{incident.code}</span>
        {incident.peopleAffected != null && <span>👥 {incident.peopleAffected} people</span>}
      </div>
      {units.length > 0 && incident.status !== "resolved" && (
        <ul className="mt-2.5 space-y-1 rounded-xl bg-slate-50 p-2.5 ring-1 ring-inset ring-slate-200">
          {units.map((unit) => (
            <li key={unit.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-mono font-semibold tracking-wide text-slate-800">{unitIcon(unit.kind)} {unitTitle(unit)}</span>
              <span className="text-slate-500">{arrivalText(trip(unit, incident, now, speed))}</span>
            </li>
          ))}
        </ul>
      )}
      {duplicateOf && (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
          ⚠️ May be the same event as {typeLabel(duplicateOf.type).toLowerCase()} in {duplicateOf.location.area} ({duplicateOf.code}), reported nearby at the same time.
        </p>
      )}
      {incident.status === "needs_info" && <AnswerBox incident={incident} onAnswered={onAnswered} />}
    </div>
  );
}

export default function EmergencyList({ incidents, resources = [], selectedId, onSelect, onNew, onAnswered }) {
  const speed = useDemoSpeed();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  const unitsById = new Map(resources.map((r) => [r.id, r]));
  const [showResolved, setShowResolved] = useState(false);
  // Newest report always on top.
  const newestFirst = (a, b) => new Date(b.reportedAt) - new Date(a.reportedAt);
  const open = incidents.filter((i) => i.status !== "resolved").sort(newestFirst);
  const resolved = incidents.filter((i) => i.status === "resolved").sort(newestFirst);
  const shown = showResolved ? resolved : open;

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="px-4 pb-3 pt-4">
        <Button size="lg" variant="danger" className="w-full" onClick={onNew}>
          <span className="text-lg leading-none">＋</span> New emergency
        </Button>
        <div className="mt-4 flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
          {[["Open", open.length, false], ["Resolved", resolved.length, true]].map(([label, count, value]) => (
            <button key={label} onClick={() => setShowResolved(value)}
              className={`flex-1 rounded-lg py-1.5 transition ${showResolved === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {label} <span className="text-slate-400">{count}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {shown.length === 0 ? (
          <EmptyState icon={showResolved ? "📁" : "🌤️"} title={showResolved ? "Nothing resolved yet" : "All quiet"}>
            {showResolved ? "Emergencies move here when every unit reports the job is done." : "When a call comes in, press New emergency."}
          </EmptyState>
        ) : (
          shown.map((incident) => (
            <EmergencyCard key={incident.id} incident={incident} incidents={incidents} now={now} speed={speed}
              units={(incident.assignedResources ?? []).map((id) => unitsById.get(id)).filter(Boolean)}
              selected={incident.id === selectedId} onSelect={onSelect} onAnswered={onAnswered} />
          ))
        )}
      </div>
    </section>
  );
}
