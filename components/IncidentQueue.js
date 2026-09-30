// Owner: Daksh
"use client";

import { useState } from "react";

export const SEVERITY_BADGES = {
  5: {
    bg: "bg-[#e11900]",
    text: "text-white",
    label: "SEV 5 • CRITICAL",
  },
  4: {
    bg: "bg-[#ff7000]",
    text: "text-white",
    label: "SEV 4 • HIGH",
  },
  3: {
    bg: "bg-[#f59e0b]",
    text: "text-black",
    label: "SEV 3 • MEDIUM",
  },
  2: {
    bg: "bg-[#276ef1]",
    text: "text-white",
    label: "SEV 2 • LOW",
  },
  1: {
    bg: "bg-neutral-600",
    text: "text-white",
    label: "SEV 1 • MINOR",
  },
};

export const STATUS_PILLS = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  assessing: "bg-purple-50 text-purple-700 border-purple-200 animate-pulse",
  needs_info: "bg-amber-50 text-amber-800 border-amber-300",
  planned: "bg-sky-50 text-sky-700 border-sky-200",
  dispatched: "bg-emerald-50 text-emerald-800 border-emerald-300",
  resolved: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

export default function IncidentQueue({
  incidents = [],
  selectedIncidentId = null,
  onSelectIncident = () => {},
  loading = false,
  collapsed = false,
  onToggleCollapse = () => {},
}) {
  const [filter, setFilter] = useState("all"); // 'all' | 'critical' | 'active'

  const filtered = incidents.filter((inc) => {
    if (filter === "critical") return inc.severity === 5 || inc.severity === 4;
    if (filter === "active") return inc.status !== "resolved";
    return true;
  });

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="absolute top-20 left-4 z-20 bg-white shadow-2xl rounded-full px-4 py-2.5 border border-neutral-200 text-xs font-bold text-black flex items-center gap-2 hover:bg-neutral-50 transition"
      >
        <span>🚨 Incident Queue ({incidents.length})</span>
      </button>
    );
  }

  return (
    <div className="absolute top-20 left-4 bottom-6 z-20 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-3xl border border-neutral-200/90 shadow-2xl flex flex-col overflow-hidden font-sans select-none">
      {/* Header */}
      <div className="p-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold tracking-tight text-black">
              Emergency Queue
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800">
              {incidents.length}
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 font-medium">
            Active Bengaluru incident dispatches
          </p>
        </div>

        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs transition"
          title="Minimize queue"
        >
          ❮
        </button>
      </div>

      {/* Filter Tabs (Uber pill style) */}
      <div className="px-4 py-2.5 border-b border-neutral-100 flex items-center gap-1.5 shrink-0 bg-neutral-50/50">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
            filter === "all"
              ? "bg-black text-white shadow-sm"
              : "text-neutral-600 hover:text-black hover:bg-neutral-200/60"
          }`}
        >
          All ({incidents.length})
        </button>
        <button
          onClick={() => setFilter("critical")}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
            filter === "critical"
              ? "bg-[#e11900] text-white shadow-sm"
              : "text-neutral-600 hover:text-black hover:bg-neutral-200/60"
          }`}
        >
          Critical
        </button>
        <button
          onClick={() => setFilter("active")}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
            filter === "active"
              ? "bg-black text-white shadow-sm"
              : "text-neutral-600 hover:text-black hover:bg-neutral-200/60"
          }`}
        >
          Active
        </button>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-neutral-400">
            No incidents found in this filter.
          </div>
        ) : (
          filtered.map((inc) => {
            const isSelected = inc.id === selectedIncidentId;
            const sev = inc.severity ? SEVERITY_BADGES[inc.severity] : null;
            const statusClass =
              STATUS_PILLS[inc.status] ||
              "bg-neutral-100 text-neutral-600 border-neutral-200";

            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? "bg-white border-black ring-2 ring-black/10 shadow-lg"
                    : "bg-white hover:bg-neutral-50 border-neutral-200/80 shadow-sm"
                }`}
              >
                {/* Top: Code & Severity Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-black tracking-tight">
                      {inc.code}
                    </span>
                    <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">
                      {inc.type}
                    </span>
                  </div>

                  {sev ? (
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wider ${sev.bg} ${sev.text}`}
                    >
                      {sev.label}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700">
                      ASSESSING
                    </span>
                  )}
                </div>

                {/* Location with Pin */}
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-black shrink-0" />
                  <span className="truncate">{inc.location?.area || "Bengaluru"}</span>
                </div>

                {/* Description */}
                <p className="text-xs text-neutral-600 font-normal leading-relaxed line-clamp-2 mb-2.5 pl-4">
                  {inc.description}
                </p>

                {/* Bottom Tags */}
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-neutral-100 pl-4">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold uppercase border text-[10px] ${statusClass}`}
                    >
                      {inc.status.replace("_", " ")}
                    </span>
                  </div>

                  {inc.peopleAffected !== null && (
                    <span className="font-bold text-[#e11900]">
                      {inc.peopleAffected} affected
                    </span>
                  )}
                </div>

                {/* Needs Info Callout */}
                {inc.status === "needs_info" && (
                  <div className="mt-2.5 bg-amber-50 border border-amber-200 rounded-xl p-2 text-[11px] text-amber-900 font-medium flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>Follow-up question pending</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
