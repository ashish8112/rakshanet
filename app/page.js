// Owner: Daksh
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import UberSidebar from "@/components/UberSidebar";
import UberTopBar from "@/components/UberTopBar";
import IncidentQueue from "@/components/IncidentQueue";
import PlanPanel from "@/components/PlanPanel";
import ReportModal from "@/components/ReportModal";
import {
  getIncidents,
  getResources,
  getCurrentPlan,
  getLogs,
} from "@/components/api";

// Dynamically import LeafletMap with SSR disabled per CONTRACT / brief
const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#f6f6f6] font-sans text-neutral-500">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
        <span className="text-xs font-semibold tracking-wider">
          Initializing Bengaluru Operations Map...
        </span>
      </div>
    </div>
  ),
});

export default function UberDashboardPage() {
  const [incidents, setIncidents] = useState([]);
  const [resources, setResources] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [logs, setLogs] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [loading, setLoading] = useState(true);

  // UI Drawer states
  const [activeNav, setActiveNav] = useState("map");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Report Modal states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [clickedLocation, setClickedLocation] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [incRes, resRes, planRes, logRes] = await Promise.all([
        getIncidents(),
        getResources(),
        getCurrentPlan(),
        getLogs(),
      ]);

      if (incRes.ok) setIncidents(incRes.data || []);
      if (resRes.ok) setResources(resRes.data || []);
      if (planRes.ok) setCurrentPlan(planRes.data || null);
      if (logRes.ok) setLogs(logRes.data || []);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle map click: prompt to report emergency at exact lat/lng
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 font-sans">
      {/* Left Vertical Nav Rail (Uber Fleet design) */}
      <UberSidebar
        activeView={activeNav}
        onSelectView={(view) => {
          setActiveNav(view);
          if (view === "incidents") setLeftCollapsed(false);
          if (view === "planner") setRightCollapsed(false);
        }}
        incidentCount={incidents.length}
        unitCount={resources.filter((r) => r.status === "available").length}
      />

      {/* Main Map Canvas Area */}
      <main className="flex-1 relative h-full w-full overflow-hidden">
        {/* Floating Top Search & Control Bar */}
        <UberTopBar
          incidents={incidents}
          resources={resources}
          currentPlan={currentPlan}
          onOpenReport={() => {
            setClickedLocation(null);
            setIsReportModalOpen(true);
          }}
          onSearch={setSearchQuery}
          onRefresh={loadData}
        />

        {/* Full-Bleed Interactive Leaflet Map */}
        <div className="absolute inset-0 w-full h-full">
          <LeafletMap
            incidents={displayedIncidents}
            resources={resources}
            currentPlan={currentPlan}
            selectedIncident={selectedIncident}
            onSelectIncident={(inc) => {
              setSelectedIncident((prev) => (prev?.id === inc.id ? null : inc));
              setLeftCollapsed(false);
            }}
            onSelectResource={(res) => setSelectedResource(res)}
            onMapClick={handleMapClick}
          />
        </div>

        {/* Floating Left Drawer: Emergency Incident Queue */}
        <IncidentQueue
          incidents={displayedIncidents}
          selectedIncidentId={selectedIncident?.id}
          onSelectIncident={(inc) =>
            setSelectedIncident((prev) => (prev?.id === inc.id ? null : inc))
          }
          loading={loading}
          collapsed={leftCollapsed}
          onToggleCollapse={() => setLeftCollapsed((prev) => !prev)}
        />

        {/* Floating Right Drawer: AI Dispatch Plan & Timeline */}
        <PlanPanel
          currentPlan={currentPlan}
          logs={logs}
          resources={resources}
          incidents={incidents}
          onRefresh={loadData}
          loading={loading}
          collapsed={rightCollapsed}
          onToggleCollapse={() => setRightCollapsed((prev) => !prev)}
        />

        {/* Floating Bottom Help Pill */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/85 backdrop-blur-md text-white text-xs font-medium px-4 py-2 rounded-full shadow-2xl border border-neutral-800 pointer-events-none hidden md:flex items-center gap-2">
          <span>💡 Click anywhere on the map to set an incident location</span>
        </div>
      </main>

      {/* Emergency Report Modal (Uber style) */}
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
