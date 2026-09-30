// Owner: Daksh
"use client";

import { useState, useEffect } from "react";
import { USE_MOCK } from "@/components/api";

export default function UberTopBar({
  incidents = [],
  resources = [],
  currentPlan = null,
  onOpenReport = () => {},
  onSearch = () => {},
  onRefresh = () => {},
}) {
  const [query, setQuery] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
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

  const freeUnits = resources.filter(
    (r) => r.status === "available" && ["ambulance", "fire_unit", "rescue_team"].includes(r.kind)
  ).length;

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-3 pointer-events-none">
      {/* Left: Floating Search Bar (Uber style) */}
      <div className="flex items-center gap-2 pointer-events-auto max-w-md w-full">
        <div className="flex-1 bg-white/95 backdrop-blur-md shadow-xl rounded-full px-4 py-2.5 border border-neutral-200/80 flex items-center gap-3">
          <svg
            className="w-4 h-4 text-neutral-500 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSearch(e.target.value);
            }}
            placeholder="Search areas, incident codes or units..."
            className="w-full text-xs font-medium text-black placeholder:text-neutral-400 bg-transparent focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                onSearch("");
              }}
              className="text-neutral-400 hover:text-black text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right: Status Pills & Action Button */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Metric Badges */}
        <div className="hidden lg:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-full border border-neutral-200/80 shadow-lg text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-neutral-700">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span>
              <strong>{incidents.length}</strong> Incidents
            </span>
            {criticalCount > 0 && (
              <span className="text-red-600 font-extrabold">
                ({criticalCount} Critical)
              </span>
            )}
          </div>
          <span className="text-neutral-300">|</span>
          <div className="flex items-center gap-1.5 text-neutral-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              <strong>{freeUnits}</strong> Units Ready
            </span>
          </div>
        </div>

        {/* Clock & Mock tag */}
        <div className="hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-2 rounded-full border border-neutral-200/80 shadow-lg text-xs font-medium text-neutral-600">
          <span>{time}</span>
          {USE_MOCK && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white">
              MOCK
            </span>
          )}
        </div>


        {/* Black Pill Report Button (Uber signature) */}
        <button
          onClick={onOpenReport}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-bold tracking-tight shadow-2xl transition-all active:scale-95 border border-black"
        >
          <svg
            className="w-4 h-4 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Report Emergency</span>
        </button>
      </div>
    </div>
  );
}
