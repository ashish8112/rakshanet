// Right panel, "Activity" tab: what each AI assistant did, newest plan first.
"use client";

import { useEffect, useState } from "react";
import { getLogs } from "@/components/api";
import { AGENT_INFO, timeAgo } from "@/components/labels";
import { EmptyState, ErrorNote } from "@/components/ui";

function Entry({ log }) {
  const agent = AGENT_INFO[log.agent] ?? { label: log.agent, icon: "•" };
  const escalation = log.message.startsWith("Escalation");
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ring-4 ring-slate-50 ${escalation ? "bg-amber-100" : "bg-white ring-1"}`}>
        {escalation ? "⚠️" : agent.icon}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-xs font-medium text-slate-400">{agent.label} · {timeAgo(log.createdAt)}</p>
        <p className={`text-sm leading-relaxed ${escalation ? "text-amber-900" : "text-slate-700"}`}>{log.message}</p>
      </div>
    </li>
  );
}

export default function ActivityTab({ refreshKey }) {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    getLogs().then((res) => {
      if (ignore) return;
      if (res.ok) {
        setLogs(res.data);
        setError("");
      } else {
        setError(res.error?.message ?? "Could not load the activity.");
      }
    });
    return () => { ignore = true; };
  }, [refreshKey]);

  if (error) return <div className="p-5"><ErrorNote message={error} /></div>;
  if (!logs) return <div className="p-5 text-sm text-slate-400">Loading…</div>;
  if (logs.length === 0) {
    return <EmptyState icon="🕒" title="No activity yet">Every step the AI takes, and every approval, appears here.</EmptyState>;
  }

  const versions = [...new Set(logs.map((l) => l.planVersion))].sort((a, b) => b - a);
  return (
    <div className="space-y-4 p-5">
      <p className="text-sm text-slate-500">Everything the AI did, step by step. Nothing is hidden.</p>
      {versions.map((version, index) => (
        <details key={version} open={index === 0} className="group rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
          <summary className="cursor-pointer list-none font-medium text-slate-800">
            <span className="inline-block transition group-open:rotate-90">›</span> Plan {version}
          </summary>
          <ol className="relative mt-4 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-slate-200">
            {logs.filter((l) => l.planVersion === version).map((log) => <Entry key={log.id} log={log} />)}
          </ol>
        </details>
      ))}
    </div>
  );
}
