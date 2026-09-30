// Impact numbers for today, computed from the real records (History + plans), never estimated.
"use client";

import { useEffect, useState } from "react";
import { getActivity, getPlanHistory } from "@/components/api";

const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();

export default function ImpactStrip({ incidents, refreshKey }) {
  const [activity, setActivity] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    let ignore = false;
    Promise.all([getActivity(), getPlanHistory()]).then(([a, p]) => {
      if (ignore) return;
      if (a.ok) setActivity(a.data);
      if (p.ok) setPlans(p.data);
    });
    return () => { ignore = true; };
  }, [refreshKey]);

  const today = incidents.filter((i) => isToday(i.reportedAt) && i.status !== "cancelled");
  const resolved = today.filter((i) => i.status === "resolved").length;
  const helped = today.filter((i) => ["dispatched", "resolved"].includes(i.status)).reduce((sum, i) => sum + (i.peopleAffected ?? 0), 0);

  // Call to units sent: reported time -> first "units sent" entry that includes the emergency.
  const firstSent = new Map();
  for (const item of [...activity].reverse()) {
    if (item.type !== "units_sent") continue;
    for (const id of item.incidentIds) if (!firstSent.has(id)) firstSent.set(id, new Date(item.createdAt));
  }
  const waits = today.filter((i) => firstSent.has(i.id)).map((i) => (firstSent.get(i.id) - new Date(i.reportedAt)) / 60000).filter((m) => m >= 0);
  const avgToSend = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : null;

  const sentAssignments = plans.filter((p) => p.status === "committed" && isToday(p.createdAt)).flatMap((p) => p.assignments);
  const avgEta = sentAssignments.length ? sentAssignments.reduce((s, a) => s + a.etaMinutes, 0) / sentAssignments.length : null;

  const stats = [
    ["📞", today.length, "emergencies today"],
    ["✅", resolved, "resolved"],
    ["👥", helped, "people helped"],
    ["⏱️", avgToSend == null ? "–" : avgToSend < 1 ? "<1 min" : `${avgToSend.toFixed(1)} min`, "call to units sent"],
    ["🚑", avgEta == null ? "–" : `${Math.round(avgEta)} min`, "average arrival time"],
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {stats.map(([icon, value, label]) => (
        <div key={label} className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200">
          <p className="text-lg">{icon}</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      ))}
    </div>
  );
}
