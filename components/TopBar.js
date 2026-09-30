// Owner: Daksh
"use client";

import { useState, useEffect } from "react";
import { USE_MOCK, seedDatabase } from "@/components/api";

export default function TopBar({
  incidents = [],
  resources = [],
  currentPlan = null,
  onOpenReport = () => {},
  onRefresh = () => {},
}) {
  const [time, setTime] = useState("");
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const criticalCount = incidents.filter(
    (i) => i.severity === 5 || i.severity === 4
  ).length;

  const availableUnits = resources.filter(
    (r) =>
      r.status === "available" &&
      ["ambulance", "fire_unit", "rescue_team"].includes(r.kind)
  ).length;

  const handleSeed = async () => {
    if (seeding) return;
    setSeeding(true);
    await seedDatabase();
    await onRefresh();
    setSeeding(false);
  };

  return (
    <header className="h-14 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between select-none z-30 shrink-0">
      {/* Brand & Center ID */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-base">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute"></span>
            <span className="w-2 h-2 rounded-full bg-red-500 relative"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-base text-white">
                RAKSHA<span className="text-red-500">NET</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono tracking-tight bg-red-950/80 text-red-400 border border-red-800/60 font-medium">
                EOC LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono leading-none">
              Bengaluru Emergency Operations Centre
            </p>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-800 hidden md:block" />

        {/* Live Counters */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/80">
            <span className="text-slate-400">INCIDENTS:</span>
            <span className="text-white font-bold">{incidents.length}</span>
            {criticalCount > 0 && (
              <span className="text-red-400 font-bold">
                ({criticalCount} CRITICAL)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/80">
            <span className="text-slate-400">READY UNITS:</span>
            <span className="text-emerald-400 font-bold">{availableUnits}</span>
          </div>
          {currentPlan && (
            <div className="flex items-center gap-2 bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/80">
              <span className="text-slate-400">PLAN:</span>
              <span className="text-sky-400 font-bold">
                v{currentPlan.version} [{currentPlan.status.toUpperCase()}]
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950/60 border border-slate-800 font-mono text-xs text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{time || "14:00:00"} IST</span>
        </div>

        {/* Mock Badge */}
        {USE_MOCK && (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800/60 hidden sm:inline-block">
            MOCK MODE
          </span>
        )}

        {/* Seed Reset Button */}
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-mono transition-all border border-slate-700 disabled:opacity-50"
          title="Reset database to initial seed"
        >
          {seeding ? "Resetting..." : "Reset Data"}
        </button>

        {/* Report Button */}
        <button
          onClick={onOpenReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-semibold tracking-wide transition-all shadow-lg shadow-red-900/30 border border-red-400/30"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Report Incident</span>
        </button>
      </div>
    </header>
  );
}
