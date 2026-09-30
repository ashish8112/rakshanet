// Right panel, "AI Plan" tab: ask the AI, read its plan in plain words, approve & send or reject.
"use client";

import { useEffect, useRef, useState } from "react";
import { approvePlan, dispatchPlan, rejectPlan } from "@/components/api";
import { AGENT_INFO, typeIcon, typeLabel, unitIcon, unitSubtitle, unitTitle, withPlates } from "@/components/labels";
import { Button, EmptyState, ErrorNote, Pill } from "@/components/ui";

const THINKING_STEPS = ["incident_assessment", "route_logistics", "resource_allocation", "command_planning"];

// Live view while the AI works: which assistant is busy, and every real step and tool call as it happens.
function Thinking({ steps, resources }) {
  const feed = useRef(null);
  const reached = steps.reduce((max, s) => Math.max(max, THINKING_STEPS.indexOf(s.agent)), 0);
  const backup = steps.some((s) => /backup rules/i.test(s.message));
  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" });
  }, [steps.length]);
  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" /></span>
        <p className="text-lg font-semibold text-slate-900">The AI is planning — live</p>
      </div>
      <p className="mt-1 text-sm text-slate-500">Four assistants work one after another. Every step below is real.</p>
      <ol className="mt-4 grid grid-cols-2 gap-2">
        {THINKING_STEPS.map((agent, index) => {
          const state = index < reached ? "done" : index === reached ? "active" : "todo";
          return (
            <li key={agent} className={`flex items-center gap-2 rounded-xl p-2.5 text-xs transition ${state === "active" ? "bg-blue-50 ring-1 ring-blue-200" : state === "done" ? "bg-emerald-50" : "bg-slate-50"}`}>
              <span className="text-base">{state === "done" ? "✅" : AGENT_INFO[agent].icon}</span>
              <span className={state === "todo" ? "text-slate-400" : "font-medium text-slate-800"}>{AGENT_INFO[agent].label}</span>
              {state === "active" && <span className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />}
            </li>
          );
        })}
      </ol>
      {backup && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-inset ring-amber-200">The AI service is busy, so the backup rules are finishing this plan. You still approve it as usual.</p>}
      <ol ref={feed} className="mt-4 min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-2xl bg-[#0f172a] p-3 font-mono text-[11.5px] leading-relaxed">
        {steps.length === 0 && <li className="text-slate-400">Starting…</li>}
        {steps.map((s, i) => (
          <li key={i} className={s.kind === "tool" ? "text-sky-300" : s.kind === "status" ? "text-slate-400 italic" : "text-[#f1f5f9]"}>
            <span className="text-slate-500">{new Date(s.at).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })} </span>
            {s.kind === "tool" ? "🔧 " : s.kind === "status" ? "" : `${AGENT_INFO[s.agent]?.icon ?? "•"} `}
            {withPlates(s.message, resources)}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Assignments({ plan, incidentsById, unitsById, resources }) {
  const groups = new Map();
  for (const a of plan.assignments) {
    if (!groups.has(a.incidentId)) groups.set(a.incidentId, []);
    groups.get(a.incidentId).push(a);
  }
  if (groups.size === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Who goes where</h3>
      <div className="space-y-3">
        {[...groups].map(([incidentId, list]) => {
          const incident = incidentsById.get(incidentId);
          return (
            <div key={incidentId} className="rounded-2xl bg-white p-3.5 ring-1 ring-slate-200">
              <p className="font-medium text-slate-900">
                {incident ? `${typeIcon(incident.type)} ${typeLabel(incident.type)} in ${incident.location.area}` : "Emergency"}
              </p>
              <ul className="mt-2 space-y-2.5">
                {list.map((a) => {
                  const unit = unitsById.get(a.resourceId);
                  const destination = a.destinationId && unitsById.get(a.destinationId);
                  return (
                    <li key={a.resourceId} className="flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-lg ring-1 ring-slate-200">{unitIcon(unit?.kind)}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800">
                          <span className="font-mono font-semibold tracking-wide">{unit ? unitTitle(unit) : "Removed unit"}</span>
                          <span className="text-slate-500"> · {a.etaMinutes} min away ({a.distanceKm} km)</span>
                        </p>
                        {unit && <p className="text-xs text-slate-400">{unitSubtitle(unit)}</p>}
                        <p className="text-xs leading-relaxed text-slate-500">{withPlates(a.reason, resources)}</p>
                        {destination && <p className="text-xs text-slate-500">Then to {unitIcon(destination.kind)} {destination.name.replace(" (demo)", "")}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PlanTab({ plan, incidents, resources, thinking, steps = [], planError, onAskAI, onChanged, userName }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const incidentsById = new Map(incidents.map((i) => [i.id, i]));
  const unitsById = new Map(resources.map((r) => [r.id, r]));
  const waiting = incidents.filter((i) => ["new", "assessing"].includes(i.status)).length;

  if (thinking) return <Thinking steps={steps} resources={resources} />;

  const send = async (planToSend) => {
    const res = await dispatchPlan(planToSend.id);
    if (!res.ok) return setError(res.error?.message ?? "Could not send the units.");
    if (!res.data.committed) {
      setError("Some units were taken by something else since this plan was made. The AI is making a fresh plan.");
      onChanged();
      return onAskAI({ trigger: "resource_change" });
    }
    onChanged();
  };

  const approveAndSend = async () => {
    setBusy("approve");
    setError("");
    const approved = await approvePlan(plan.id, userName ? `Approved by ${userName}` : "");
    if (!approved.ok) {
      setBusy("");
      return setError(approved.error?.message ?? "Could not approve the plan.");
    }
    await send(plan);
    setBusy("");
  };

  const reject = async () => {
    setBusy("reject");
    setError("");
    const res = await rejectPlan(plan.id, [rejectReason.trim(), userName && `(by ${userName})`].filter(Boolean).join(" "));
    setBusy("");
    if (!res.ok) return setError(res.error?.message ?? "Could not reject the plan.");
    setRejecting(false);
    setRejectReason("");
    onChanged();
  };

  const askButton = (label = "Ask AI for a plan", variant = "primary") => (
    <Button size="lg" variant={variant} className="w-full" onClick={() => onAskAI({ trigger: "manual" })}>✨ {label}</Button>
  );

  const waitingNote = waiting > 0 && (
    <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-inset ring-blue-200">
      <p className="font-medium text-blue-900">{waiting === 1 ? "1 emergency is" : `${waiting} emergencies are`} waiting for a plan</p>
      <p className="mb-3 mt-0.5 text-sm text-blue-800">The AI will look at every open emergency and suggest who to send.</p>
      {askButton()}
    </div>
  );

  // No plan, or the last one is finished (sent or rejected).
  if (!plan || plan.status === "rejected") {
    return (
      <div className="space-y-4 p-5">
        <ErrorNote message={planError || error} onRetry={planError ? () => onAskAI({ trigger: "manual" }) : undefined} />
        {waitingNote || (
          <EmptyState icon="🗺️" title="No plan yet">
            <p>Add an emergency, then ask the AI to suggest which units to send. Nothing is sent until you approve.</p>
            <div className="mt-4">{askButton()}</div>
          </EmptyState>
        )}
      </div>
    );
  }

  const sent = plan.status === "committed";
  return (
    <div className="space-y-5 p-5">
      <ErrorNote message={planError || error} onRetry={planError ? () => onAskAI({ trigger: "manual" }) : undefined} />

      {!sent && waiting > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-blue-50 p-3.5 text-sm text-blue-900 ring-1 ring-inset ring-blue-200">
          <span>{waiting === 1 ? "A new emergency came in" : `${waiting} new emergencies came in`} after this plan was made.</span>
          <Button size="sm" onClick={() => onAskAI({ trigger: "new_incident" })}>Re-plan</Button>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2">
          {sent ? <Pill tone="green">✓ Units sent</Pill> : plan.status === "approved" ? <Pill tone="blue">Approved, not sent yet</Pill> : <Pill tone="amber">Needs your approval</Pill>}
          <span className="text-xs text-slate-400">Plan {plan.version}</span>
          {plan.source === "backup" && <Pill tone="gray">🛟 Backup plan</Pill>}
          {plan.source === "manual" && <Pill tone="gray">✋ Chosen by hand</Pill>}
        </div>
        <p className="text-[17px] leading-relaxed text-slate-800">{withPlates(plan.summary, resources)}</p>
      </div>

      {plan.uncovered.length > 0 && (
        <div className="space-y-2">
          {plan.uncovered.map((u) => {
            const incident = incidentsById.get(u.incidentId);
            return (
              <div key={u.incidentId} className="rounded-2xl bg-amber-50 p-3.5 ring-1 ring-inset ring-amber-200">
                <p className="text-sm font-semibold text-amber-900">
                  ⚠️ {incident ? `${typeLabel(incident.type)} in ${incident.location.area}` : "An emergency"} is short of help
                </p>
                <p className="mt-0.5 text-sm text-amber-900">{withPlates(u.reason, resources)}.</p>
              </div>
            );
          })}
        </div>
      )}

      {plan.changes.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">What changed</h3>
          <ul className="space-y-1.5">
            {plan.changes.map((c, i) => (
              <li key={i} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
                <span className="font-medium">{withPlates(c.what, resources)}</span> <span className="text-slate-500">— {withPlates(c.why, resources)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Assignments plan={plan} incidentsById={incidentsById} unitsById={unitsById} resources={resources} />

      {plan.alternatives.length > 0 && !sent && (
        <details className="group rounded-2xl bg-white p-3.5 ring-1 ring-slate-200">
          <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">
            <span className="inline-block transition group-open:rotate-90">›</span> Other options the AI considered ({plan.alternatives.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {plan.alternatives.map((a, i) => (
              <li key={i} className="text-sm">
                <p className="text-slate-800">{withPlates(a.summary, resources)}</p>
                <p className="text-slate-500">Cost: {withPlates(a.tradeoff, resources)}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {plan.status === "proposed" && !rejecting && (
        <div className="sticky bottom-0 -mx-5 space-y-2 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <Button size="lg" variant="success" className="w-full" onClick={approveAndSend} loading={busy === "approve"}>
            ✓ Approve &amp; send units
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setRejecting(true)} disabled={!!busy}>
            Reject this plan
          </Button>
        </div>
      )}

      {rejecting && (
        <div className="space-y-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
          <p className="text-sm font-medium text-slate-800">Why are you rejecting it? (optional)</p>
          <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. AMB-03 is already busy"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <div className="flex gap-2">
            <Button variant="danger" className="flex-1" onClick={reject} loading={busy === "reject"}>Reject</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setRejecting(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {plan.status === "approved" && (
        <Button size="lg" variant="success" className="w-full" loading={busy === "send"}
          onClick={async () => { setBusy("send"); setError(""); await send(plan); setBusy(""); }}>
          Send units now
        </Button>
      )}

      {sent && (waitingNote || <div className="pt-1">{askButton("Ask AI for a new plan", "secondary")}</div>)}
    </div>
  );
}
