// The control room: emergencies (left), map (centre), AI plan / units / activity (right).
"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Header, { HelpDialog } from "@/components/Header";
import EmergencyList from "@/components/EmergencyList";
import NewEmergency, { areaFor } from "@/components/NewEmergency";
import PlanTab from "@/components/PlanTab";
import UnitsTab from "@/components/UnitsTab";
import ActivityTab from "@/components/ActivityTab";
import { generatePlan, getCurrentPlan, getIncidents, getResources, whoAmI } from "@/components/api";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-400">Loading map…</div>,
});

const REFRESH_MS = 15000;
const RIGHT_TABS = [["plan", "AI Plan"], ["units", "Units"], ["activity", "Activity"]];
const MOBILE_VIEWS = [["list", "🚨", "Emergencies"], ["map", "🗺️", "Map"], ["plan", "✨", "Plan"], ["units", "🚑", "Units"], ["activity", "🕒", "Activity"]];

export default function ControlRoom() {
  const [incidents, setIncidents] = useState([]);
  const [resources, setResources] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [userName, setUserName] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [rightTab, setRightTab] = useState("plan");
  const [mobileView, setMobileView] = useState("list");
  const [thinking, setThinking] = useState(false);
  const [planError, setPlanError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [creating, setCreating] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickedLocation, setPickedLocation] = useState(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    const [inc, res, cur] = await Promise.all([getIncidents(), getResources(), getCurrentPlan()]);
    if (inc.ok) setIncidents(inc.data);
    if (res.ok) setResources(res.data);
    if (cur.ok) setPlan(cur.data);
    setLoadError(inc.ok && res.ok ? "" : (inc.error ?? res.error)?.message ?? "Could not load the latest data.");
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let ignore = false;
    whoAmI().then((res) => { if (!ignore && res.ok) setUserName(res.data.name ?? ""); });
    Promise.all([getIncidents(), getResources(), getCurrentPlan()]).then(([inc, res, cur]) => {
      if (ignore) return;
      if (inc.ok) setIncidents(inc.data);
      if (res.ok) setResources(res.data);
      if (cur.ok) setPlan(cur.data);
      if (!inc.ok || !res.ok) setLoadError((inc.error ?? res.error)?.message ?? "Could not load the data.");
    });
    return () => { ignore = true; };
  }, []);

  // Keep the screen fresh (other dispatchers, crews), but not while the AI is working.
  useEffect(() => {
    if (thinking) return undefined;
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load, thinking]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const askAI = useCallback(async (args) => {
    setRightTab("plan");
    setMobileView("plan");
    setThinking(true);
    setPlanError("");
    const res = await generatePlan(args);
    if (!res.ok) setPlanError(res.error?.message ?? "The AI could not make a plan.");
    await load();
    setThinking(false);
  }, [load]);

  const startCreating = () => {
    setCreating(true);
    setPickedLocation(null);
    setMobileView("list");
  };
  const stopCreating = () => {
    setCreating(false);
    setPicking(false);
    setPickedLocation(null);
  };

  const openCount = incidents.filter((i) => i.status !== "resolved").length;
  const freeUnits = resources.filter((r) => ["ambulance", "fire_unit", "rescue_team"].includes(r.kind) && r.status === "available").length;
  const needsDecision = incidents.filter((i) => i.status === "needs_info").length + (plan?.status === "proposed" ? 1 : 0);

  const leftColumn = creating ? (
    <NewEmergency
      location={pickedLocation}
      onChooseOnMap={() => { setPicking(true); setMobileView("map"); }}
      onChooseArea={(location) => { setPickedLocation(location); setPicking(false); }}
      onClose={stopCreating}
      onCreated={async (incident) => {
        stopCreating();
        await load();
        setSelectedId(incident.id);
        setRightTab("plan");
        setToast(incident.duplicates?.length ? "Saved. It may be a duplicate of a nearby report, check the card." : "Emergency saved. Ask the AI for a plan when you are ready.");
      }}
    />
  ) : (
    <EmergencyList
      incidents={incidents}
      selectedId={selectedId}
      onSelect={(id) => setSelectedId(id)}
      onNew={startCreating}
      onAnswered={(incident) => askAI({ trigger: "manual", incidentId: incident.id })}
    />
  );

  const rightContent = {
    plan: (
      <PlanTab plan={plan} incidents={incidents} resources={resources} thinking={thinking} planError={planError}
        onAskAI={askAI} onChanged={load} userName={userName} />
    ),
    units: <UnitsTab resources={resources} incidents={incidents} onChanged={load} onAskAI={askAI} />,
    activity: <ActivityTab refreshKey={refreshKey} />,
  };

  const map = (
    <div className="relative h-full w-full">
      <MapView incidents={incidents} resources={resources} selectedId={selectedId} onSelectIncident={setSelectedId}
        picking={picking} pickedLocation={pickedLocation}
        onPick={(point) => { setPickedLocation({ ...point, area: areaFor(point) }); setPicking(false); setMobileView("list"); }} />
      {picking && (
        <div className="absolute left-1/2 top-4 z-[1000] flex -translate-x-1/2 items-center gap-3 rounded-full bg-slate-900 px-5 py-2.5 text-sm text-white shadow-xl">
          📍 Click where the emergency is
          <button onClick={() => setPicking(false)} className="rounded-full bg-white/15 px-3 py-0.5 hover:bg-white/25">Cancel</button>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] hidden rounded-2xl bg-white/95 px-4 py-3 text-xs text-slate-600 shadow-lg ring-1 ring-slate-200 lg:block">
        <p className="mb-1.5 font-semibold text-slate-800">On the map</p>
        <p>🔥🌊🚗 Emergencies (ring colour = how serious)</p>
        <p>🚑🚒🦺 Units · <span className="text-emerald-600">green</span> free, <span className="text-blue-600">blue</span> busy</p>
        <p>🏥🏠 Hospitals and shelters · dashed line = unit on its way</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Header openCount={openCount} freeUnits={freeUnits} needsDecision={needsDecision} userName={userName} onHelp={() => setShowHelp(true)} />

      {loadError && (
        <div className="flex items-center justify-between gap-3 bg-red-50 px-6 py-2 text-sm text-red-700">
          <span>{loadError}</span>
          <button onClick={load} className="font-semibold underline">Try again</button>
        </div>
      )}

      {/* Desktop: three columns */}
      <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[360px_1fr_420px] xl:grid-cols-[380px_1fr_460px]">
        <aside className="min-h-0 border-r border-slate-200 bg-slate-50">{leftColumn}</aside>
        <main className="min-h-0">{map}</main>
        <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-slate-50">
          <nav className="flex shrink-0 gap-1 border-b border-slate-200 bg-white px-3 pt-2">
            {RIGHT_TABS.map(([key, label]) => (
              <button key={key} onClick={() => setRightTab(key)}
                className={`relative rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${rightTab === key ? "text-blue-700" : "text-slate-500 hover:text-slate-800"}`}>
                {label}
                {key === "plan" && plan?.status === "proposed" && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" />}
                {rightTab === key && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-blue-600" />}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto">{rightContent[rightTab]}</div>
        </aside>
      </div>

      {/* Phone and tablet: one view at a time */}
      <div className="min-h-0 flex-1 overflow-y-auto lg:hidden">
        {mobileView === "list" && leftColumn}
        {mobileView === "map" && <div className="h-full">{map}</div>}
        {mobileView !== "list" && mobileView !== "map" && rightContent[mobileView]}
      </div>
      <nav className="grid shrink-0 grid-cols-5 border-t border-slate-200 bg-white lg:hidden">
        {MOBILE_VIEWS.map(([key, icon, label]) => (
          <button key={key} onClick={() => setMobileView(key)}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${mobileView === key ? "font-semibold text-blue-700" : "text-slate-500"}`}>
            <span className="text-lg">{icon}</span>{label}
          </button>
        ))}
      </nav>

      {toast && (
        <div className="fixed left-1/2 top-20 z-[2000] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-3 text-sm text-white shadow-xl">{toast}</div>
      )}
      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
    </div>
  );
}
