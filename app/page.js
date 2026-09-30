// Owner: Daksh
"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import ReportModal from "@/components/ReportModal";
import { getIncidents, getResources, getCurrentPlan } from "@/components/api";

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
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [clickedLocation, setClickedLocation] = useState(null);

  const loadData = () => {
    Promise.all([getIncidents(), getResources(), getCurrentPlan()]).then(
      ([incRes, resRes, planRes]) => {
        if (incRes.ok) setIncidents(incRes.data || []);
        if (resRes.ok) setResources(resRes.data || []);
        if (planRes.ok) setCurrentPlan(planRes.data || null);
      }
    );
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([getIncidents(), getResources(), getCurrentPlan()]).then(
      ([incRes, resRes, planRes]) => {
        if (!ignore) {
          if (incRes.ok) setIncidents(incRes.data || []);
          if (resRes.ok) setResources(resRes.data || []);
          if (planRes.ok) setCurrentPlan(planRes.data || null);
        }
      }
    );
    return () => {
      ignore = true;
    };
  }, []);

  // Handle map click: immediately capture clicked coordinates and open rescue demand modal
  const handleMapClick = (coords) => {
    setClickedLocation({
      lat: coords.lat,
      lng: coords.lng,
      area: "Pinned Map Location",
    });
    setIsReportModalOpen(true);
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

  const activeCount = incidents.filter((i) => i.status !== "resolved").length;
  const readyUnits = resources.filter((r) => r.status === "available").length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 font-sans">
      {/* Top Multi-Page Navigation Bar */}
      <Navbar
        onOpenReport={() => {
          setClickedLocation(null);
          setIsReportModalOpen(true);
        }}
        onRefresh={loadData}
      />

      {/* Main Full-Screen Map Canvas */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        {/* Full-Bleed Map */}
        <div className="absolute inset-0 w-full h-full">
          <LeafletMap
            incidents={displayedIncidents}
            resources={resources}
            currentPlan={currentPlan}
            selectedIncident={selectedIncident}
            onSelectIncident={(inc) => {
              setSelectedIncident(inc);
              setSelectedResource(null);
            }}
            onSelectResource={(res) => {
              setSelectedResource(res);
              setSelectedIncident(null);
            }}
            onMapClick={handleMapClick}
          />
        </div>

        {/* Floating Uber-Style Rescue Request & Search Card */}
        <div className="absolute top-5 left-5 z-20 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-neutral-200/80 font-sans">
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
          </div>

          {/* Big One-Click Request Button */}
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

          {/* Quick Action Chips */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
            <button
              onClick={() => {
                setClickedLocation(null);
                setIsReportModalOpen(true);
              }}
              className="py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-left flex items-center gap-2 transition"
            >
              <span>🚑</span>
              <span>Ambulance</span>
            </button>
            <button
              onClick={() => {
                setClickedLocation(null);
                setIsReportModalOpen(true);
              }}
              className="py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-left flex items-center gap-2 transition"
            >
              <span>🌊</span>
              <span>Flood Rescue</span>
            </button>
          </div>

          {/* Real-time Status Badges */}
          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-semibold text-neutral-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span>{activeCount} Active Calls</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{readyUnits} Ready Units</span>
            </div>
          </div>
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
          <span>💡 Click anywhere on the map to drop a rescue pin</span>
        </div>
      </main>

      {/* Emergency Request Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        initialLocation={clickedLocation}
        onSuccess={(newIncident) => {
          loadData();
          setSelectedIncident(newIncident);
        }}
      />
    </div>
  );
}
