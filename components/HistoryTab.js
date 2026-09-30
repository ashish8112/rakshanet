// Right panel, "History" tab: everything that happened, newest first — who reported, what the AI proposed,
// who approved or rejected, which vehicles went, what the crews reported. Filter by emergency or kind of event.
// AI plans can be opened to see each assistant's step.
"use client";

import { useEffect, useState } from "react";
import { getActivity, getLogs } from "@/components/api";
import { AGENT_INFO, typeLabel, withPlates } from "@/components/labels";
import { EmptyState, ErrorNote } from "@/components/ui";

const TYPE_STYLE = {
  incident_reported: ["📞", "Emergency"], incident_updated: ["✏️", "Emergency"], incident_resolved: ["✅", "Emergency"],
  plan_proposed: ["✨", "AI plan"], plan_approved: ["👍", "Decision"], plan_rejected: ["✋", "Decision"], plan_edited: ["✏️", "Decision"],
  units_sent: ["🚀", "Sent"], dispatch_conflict: ["⚠️", "Sent"],
  crew_arrived: ["📍", "Crew"], crew_unavailable: ["🔧", "Crew"], crew_available: ["🔄", "Crew"], crew_cleared: ["🏁", "Crew"],
  unit_added: ["➕", "Fleet"], unit_removed: ["➖", "Fleet"], data_reset: ["♻️", "System"],
};
const KIND_FILTERS = [["all", "Everything"], ["Emergency", "Emergencies"], ["AI plan", "AI plans"], ["Decision", "Decisions"], ["Sent", "Units sent"], ["Crew", "Crew updates"], ["Fleet", "Fleet changes"]];

const clock = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const day = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString() ? "Today" : d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" });
};

function AiSteps({ version, resources }) {
  const [logs, setLogs] = useState(null);
  useEffect(() => {
    let ignore = false;
    getLogs(version).then((res) => { if (!ignore) setLogs(res.ok ? res.data : []); });
    return () => { ignore = true; };
  }, [version]);
  if (!logs) return <p className="mt-2 text-xs text-slate-400">Loading the AI&apos;s steps…</p>;
  return (
    <ol className="mt-2 space-y-1.5 border-l-2 border-blue-100 pl-3">
      {logs.map((log) => (
        <li key={log.id} className="text-xs leading-relaxed text-slate-600">
          <span className="font-medium text-slate-700">{AGENT_INFO[log.agent]?.icon} {AGENT_INFO[log.agent]?.label ?? log.agent}:</span> {withPlates(log.message, resources)}
        </li>
      ))}
    </ol>
  );
}

function Entry({ item, resources }) {
  const [open, setOpen] = useState(false);
  const [icon, group] = TYPE_STYLE[item.type] ?? ["•", "Other"];
  const warn = item.type === "dispatch_conflict" || item.type === "crew_unavailable" || /Short of help/.test(item.message);
  return (
    <li className="flex gap-3">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ring-1 ${warn ? "bg-amber-50 ring-amber-200" : "bg-white ring-slate-200"}`}>{icon}</span>
      <div className="min-w-0 flex-1 pb-1">
        <p className="text-xs text-slate-400">
          <span className="font-medium text-slate-600">{clock(item.createdAt)}</span> · {group} · by <span className="font-medium text-slate-600">{item.actor}</span>
        </p>
        <p className="text-sm leading-relaxed text-slate-800">{withPlates(item.message, resources)}</p>
        {item.type === "plan_proposed" && item.planVersion && (
          <>
            <button onClick={() => setOpen((o) => !o)} className="mt-1 text-xs font-medium text-blue-700 underline underline-offset-2">
              {open ? "Hide the AI's steps" : "Show the AI's steps"}
            </button>
            {open && <AiSteps version={item.planVersion} resources={resources} />}
          </>
        )}
      </div>
    </li>
  );
}

export default function HistoryTab({ refreshKey, incidents, resources }) {
  const [incidentId, setIncidentId] = useState("");
  const [kind, setKind] = useState("all");
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    getActivity(incidentId || undefined).then((res) => {
      if (ignore) return;
      if (res.ok) { setItems(res.data); setError(""); } else setError(res.error?.message ?? "Could not load the history.");
    });
    return () => { ignore = true; };
  }, [refreshKey, incidentId]);

  const shown = (items ?? []).filter((item) => kind === "all" || (TYPE_STYLE[item.type]?.[1] ?? "Other") === kind);
  const days = [];
  for (const item of shown) {
    const label = day(item.createdAt);
    if (days.at(-1)?.label !== label) days.push({ label, items: [] });
    days.at(-1).items.push(item);
  }
  const sortedIncidents = [...incidents].sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));

  return (
    <div className="space-y-4 p-5">
      <p className="text-sm text-slate-500">Everything that happened, newest first: who did what, and when.</p>
      <div className="grid grid-cols-2 gap-2">
        <select value={incidentId} onChange={(e) => setIncidentId(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
          <option value="">All emergencies</option>
          {sortedIncidents.map((i) => (
            <option key={i.id} value={i.id}>{typeLabel(i.type)} in {i.location.area} ({i.code}){i.status === "resolved" ? " · resolved" : ""}</option>
          ))}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
          {KIND_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <ErrorNote message={error} />
      {!items && !error && <p className="text-sm text-slate-400">Loading…</p>}
      {items && shown.length === 0 && (
        <EmptyState icon="🕒" title="Nothing here yet">Reports, AI plans, approvals and crew updates will appear here as they happen.</EmptyState>
      )}
      {days.map((d) => (
        <div key={d.label}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{d.label}</p>
          <ol className="space-y-3">{d.items.map((item) => <Entry key={item.id} item={item} resources={resources} />)}</ol>
        </div>
      ))}
    </div>
  );
}
