// Owner: Daksh
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import ReportModal from "@/components/ReportModal";
import PlanPanel from "@/components/PlanPanel";
import {
  getIncidents,
  getResources,
  getCurrentPlan,
  getLogs,
} from "@/components/api";
import {
  getAreaName,
  getNearestResponders,
  BENGALURU_HUBS,
} from "@/components/geo";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#f6f6f6] font-sans text-neutral-500">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
        <span className="text-xs font-semibold tracking-wider">
          Loading Bengaluru Operations Map...
        </span>
      </div>
    </div>
  ),
});

export default function HomeDashboardPage() {
  const [incidents, setIncidents] = useState([]);
  const [resources, setResources] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [logs, setLogs] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [planCollapsed, setPlanCollapsed] = useState(true);

  const loadData = () => {
    Promise.all([
      getIncidents(),
      getResources(),
      getCurrentPlan(),
      getLogs(),
    ]).then(([incRes, resRes, planRes, logRes]) => {
      if (incRes.ok) setIncidents(incRes.data || []);
      if (resRes.ok) setResources(resRes.data || []);
      if (planRes.ok) setCurrentPlan(planRes.data || null);
      if (logRes?.ok) setLogs(logRes.data || []);
    });
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      getIncidents(),
      getResources(),
      getCurrentPlan(),
      getLogs(),
    ]).then(([incRes, resRes, planRes, logRes]) => {
      if (!ignore) {
        if (incRes.ok) setIncidents(incRes.data || []);
        if (resRes.ok) setResources(resRes.data || []);
        if (planRes.ok) setCurrentPlan(planRes.data || null);
        if (logRes?.ok) setLogs(logRes.data || []);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  // Handle direct map click: resolve human-readable area & calculate live ETA
  const handleMapClick = (coords) => {
    const area = getAreaName(coords);
    setClickedLocation({
      lat: coords.lat,
      lng: coords.lng,
      area,
    });
  };

  // Find nearest responder and estimated time to arrival for pinned location
  const nearestResponderToPin = useMemo(() => {
    if (!clickedLocation?.lat || !clickedLocation?.lng) return null;
    const list = getNearestResponders(clickedLocation, resources);
    return list[0] || null;
  }, [clickedLocation, resources]);

  // Handle selecting a predefined hub
  const handleSelectHub = (hub) => {
    setClickedLocation({
      lat: hub.lat,
      lng: hub.lng,
      area: hub.name,
    });
  };

  // Filtered incidents based on search query
  const displayedIncidents = useMemo(() => {
    if (!searchQuery.trim()) return incidents;
    const q = searchQuery.toLowerCase();
    return incidents.filter(
      (i) =>
        i.code?.toLowerCase().includes(q) ||
        i.type?.toLowerCase().includes(q) ||
        i.location?.area?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
    );
  }, [incidents, searchQuery]);

  // Suggested hubs matching search input
  const matchingHubs = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return BENGALURU_HUBS.filter((h) => h.name.toLowerCase().includes(q)).slice(
      0,
      4
    );
  }, [searchQuery]);

  const activeCount = incidents.filter((i) => i.status !== "resolved").length;
  const readyUnits = resources.filter((r) => r.status === "available").length;

  // Step 3.2: Critical Escalation check (Severity 5 or uncovered deficit)
  const hasCriticalEscalation = useMemo(() => {
    return (
      incidents.some((i) => i.severity === 5 && i.status !== "resolved") ||
      Boolean(currentPlan?.uncovered && currentPlan.uncovered.length > 0)
    );
  }, [incidents, currentPlan]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 font-sans">
      {/* Top Multi-Page Navigation Bar */}
      <Navbar
        onOpenReport={() => {
          setIsReportModalOpen(true);
        }}
        onRefresh={loadData}
      />

      {/* Step 3.2 Critical City-Wide Escalation Banner */}
      {hasCriticalEscalation && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-lg z-30 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
            <span className="truncate">
              🚨 CRITICAL ESCALATION: Severe emergency (Severity 5) / unit deficit active in Bengaluru.
            </span>
          </div>
          <Link
            href="/dispatch"
            className="px-3 py-1 bg-white hover:bg-neutral-100 text-red-600 rounded-full text-[11px] font-extrabold shadow transition shrink-0 ml-3"
          >
            Review AI Plan →
          </Link>
        </div>
      )}

      {/* Main Full-Screen Map Canvas */}
      <main className="flex-1 relative w-full h-full overflow-hidden">

        {/* Full-Bleed Map */}
        <div className="absolute inset-0 w-full h-full">
          <LeafletMap
            incidents={displayedIncidents}
            resources={resources}
            currentPlan={currentPlan}
            selectedIncident={selectedIncident}
            pendingLocation={clickedLocation}
            onSelectIncident={(inc) => {
              setSelectedIncident(inc);
              setSelectedResource(null);
            }}
            onSelectResource={(res) => {
              setSelectedResource(res);
              setSelectedIncident(null);
            }}
            onMapClick={handleMapClick}
            onRequestRescue={(loc) => {
              setClickedLocation(loc);
              setIsReportModalOpen(true);
            }}
          />
        </div>

        {/* Floating Uber-Style Rescue Request & Search Card */}
        <div className="absolute top-5 left-5 z-20 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-neutral-200/80 font-sans">
          {clickedLocation ? (
            /* PINNED RESCUE LOCATION STATE (Live ETA & Submit) */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                  Live Rescue Target Selected
                </span>
                <button
                  onClick={() => setClickedLocation(null)}
                  className="text-neutral-400 hover:text-black text-xs font-bold px-2 py-0.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition"
                >
                  ✕ Clear Pin
                </button>
              </div>

              <div>
                <h2 className="text-base font-extrabold text-black tracking-tight">
                  {clickedLocation.area}
                </h2>
                <p className="text-[11px] font-mono text-neutral-500">
                  {clickedLocation.lat.toFixed(4)}, {clickedLocation.lng.toFixed(4)}
                </p>
              </div>

              {/* Real-time Estimated Time Callout Card */}
              <div className="bg-neutral-900 text-white rounded-2xl p-4 shadow-lg border border-neutral-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Estimated Arrival Time
                  </span>
                  <span className="text-xs">⏱️</span>
                </div>
                <div className="text-3xl font-black tracking-tight text-white mb-1">
                  ~{nearestResponderToPin ? nearestResponderToPin.etaMinutes : 5} MINS
                </div>
                <p className="text-xs text-neutral-300 leading-snug">
                  {nearestResponderToPin ? (
                    <>
                      <strong>{nearestResponderToPin.resource.name}</strong> is standing by (
                      {nearestResponderToPin.distanceKm} km away)
                    </>
                  ) : (
                    "Nearest emergency rapid unit standing by"
                  )}
                </p>
              </div>

              {/* Big Direct Submit Rescue Button */}
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="w-full py-3.5 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-xs shadow-xl shadow-red-900/30 transition flex items-center justify-center gap-2 border border-red-500"
              >
                <span>🚨</span>
                <span>
                  Submit Rescue Service (~
                  {nearestResponderToPin ? nearestResponderToPin.etaMinutes : 5} min ETA)
                </span>
              </button>

              <p className="text-[11px] text-center text-neutral-500 font-medium">
                Tap anywhere else on the map to adjust rescue location
              </p>
            </div>
          ) : (
            /* DEFAULT SEARCH / MAP SELECTION STATE */
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                    Bengaluru Live Rescue
                  </span>
                  <h1 className="text-lg font-extrabold text-black tracking-tight mt-1">
                    Where do you need rescue?
                  </h1>
                </div>
                <div className="w-9 h-9 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-sm shadow-md">
                  📍
                </div>
              </div>

              {/* Search Location Input */}
              <div className="relative mb-3">
                <div className="bg-neutral-100 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 border border-neutral-200 focus-within:border-black transition">
                  <span className="text-neutral-400 text-sm">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search area (Koramangala, Indiranagar...)"
                    className="w-full bg-transparent text-xs font-semibold text-black placeholder:text-neutral-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-neutral-400 hover:text-black text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Autocomplete Hub Suggestions */}
                {matchingHubs.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden z-30">
                    {matchingHubs.map((hub) => (
                      <button
                        key={hub.name}
                        onClick={() => {
                          handleSelectHub(hub);
                          setSearchQuery("");
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-neutral-50 flex items-center justify-between border-b last:border-b-0 border-neutral-100"
                      >
                        <span className="text-black">📍 {hub.name}</span>
                        <span className="text-[10px] text-neutral-400">Select & Get ETA</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Area Chips for 1-Click Location Pinning */}
              <div className="mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                  Or select popular area:
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
                  {BENGALURU_HUBS.slice(0, 4).map((hub) => (
                    <button
                      key={hub.name}
                      onClick={() => handleSelectHub(hub)}
                      className="py-1.5 px-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-left truncate transition flex items-center gap-1.5"
                    >
                      <span>📍</span>
                      <span className="truncate">{hub.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Big Request Button */}
              <button
                onClick={() => {
                  setClickedLocation(null);
                  setIsReportModalOpen(true);
                }}
                className="w-full py-3 rounded-full bg-black hover:bg-neutral-800 active:scale-95 text-white font-bold text-xs shadow-xl transition flex items-center justify-center gap-2 mb-3"
              >
                <span>🚨</span>
                <span>Request Immediate Emergency Rescue</span>
              </button>

              {/* Map Selection Instructions Pill */}
              <div className="bg-neutral-50 rounded-2xl p-2.5 border border-neutral-200 text-center">
                <p className="text-[11px] font-semibold text-neutral-700">
                  💡 Click anywhere on the map to set rescue pin & view ETA
                </p>
              </div>

              {/* Real-time Status Badges */}
              <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] font-semibold text-neutral-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  <span>{activeCount} Active Incidents</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{readyUnits} Ready Units</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selected Incident / Unit Floating Inspector Card */}
        {selectedIncident && (
          <div className="absolute bottom-6 left-5 z-20 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-neutral-200 font-sans">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-black">
                  {selectedIncident.code}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white uppercase">
                  Sev {selectedIncident.severity || "?"}
                </span>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-neutral-400 hover:text-black text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-neutral-700 font-medium mb-2 leading-relaxed">
              {selectedIncident.description}
            </p>
            <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500 border-t border-neutral-100 pt-2">
              <span>Location: {selectedIncident.location?.area}</span>
              <span className="text-black uppercase">
                {selectedIncident.status}
              </span>
            </div>
          </div>
        )}

        {/* Map Tip Pill */}
        <div className="absolute bottom-6 right-5 z-10 bg-black/85 backdrop-blur-md text-white text-xs font-medium px-4 py-2 rounded-full shadow-2xl border border-neutral-800 pointer-events-none hidden sm:flex items-center gap-2">
          <span>💡 Click anywhere on the map to drop a rescue pin & calculate ETA</span>
        </div>

        {/* Floating Right Drawer: AI Dispatch Plan & Timeline */}
        <PlanPanel
          currentPlan={currentPlan}
          logs={logs}
          resources={resources}
          incidents={incidents}
          onRefresh={loadData}
          collapsed={planCollapsed}
          onToggleCollapse={() => setPlanCollapsed((prev) => !prev)}
        />
      </main>

      {/* Emergency Request Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        initialLocation={clickedLocation}
        resources={resources}
        onSuccess={(newIncident) => {
          loadData();
          setSelectedIncident(newIncident);
          setClickedLocation(null);
        }}
      />
    </div>
  );
}
