// Control room: emergencies (left), live map (centre), the AI plan (right). Fleet and History have their own pages.
"use client";

import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import EmergencyList from "@/components/EmergencyList";
import NewEmergency, { areaFor } from "@/components/NewEmergency";
import PlanTab from "@/components/PlanTab";
import ManualTab from "@/components/ManualTab";
import { setMode, useMode } from "@/components/useMode";
import { streamPlan } from "@/components/api";
import { useControlRoom } from "@/components/useControlRoom";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-400">Loading map…</div>,
});

// Desktop (three columns) or phone/tablet (one view at a time). Only ONE layout is rendered, so there is
// only one map: a hidden second map has no size and crashes Leaflet when it tries to fly somewhere.
const DESKTOP_QUERY = "(min-width: 1024px)";
function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(DESKTOP_QUERY);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true
  );
}

const PHONE_VIEWS = [["list", "Emergencies"], ["map", "Map"], ["plan", "Plan"]];

function ControlRoom() {
  const isDesktop = useIsDesktop();
  const mode = useMode(); // "ai" or "manual"
  const router = useRouter();
  const params = useSearchParams();
  const [thinking, setThinking] = useState(false);
  const data = useControlRoom({ paused: thinking });
  const { incidents, resources, plan, load, userName } = data;
  const [selectedId, setSelectedId] = useState(null);
  const [phoneView, setPhoneView] = useState("list");
  const [planError, setPlanError] = useState("");
  const [steps, setSteps] = useState([]);
  const [creating, setCreating] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickedLocation, setPickedLocation] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Ask the AI; every assistant's step streams in live and shows in the plan panel.
  const askAI = useCallback(async (args) => {
    setPhoneView("plan");
    setThinking(true);
    setPlanError("");
    setSteps([]);
    const res = await streamPlan(args, (step) => setSteps((list) => [...list, step]));
    if (!res.ok) setPlanError(res.error?.message ?? "The AI could not make a plan.");
    await load();
    setThinking(false);
  }, [load]);

  // Coming back from Fleet after a breakdown: plan the replacement straight away.
  const replanFor = params.get("replan");
  const handled = useRef(null);
  useEffect(() => {
    if (!replanFor || handled.current === replanFor) return;
    handled.current = replanFor;
    router.replace("/");
    if (mode === "manual") {
      setTimeout(() => {
        setPhoneView("plan");
        setToast("A vehicle broke down: choose a replacement in the Manual panel.");
      }, 0);
    } else {
      setTimeout(() => askAI({ trigger: "responder_update", resourceId: replanFor }), 0);
    }
  }, [replanFor, askAI, router, mode]);

  const stopCreating = () => {
    setCreating(false);
    setPicking(false);
    setPickedLocation(null);
  };

  const left = creating ? (
    <NewEmergency
      location={pickedLocation}
      onChooseOnMap={() => { setPicking(true); setPhoneView("map"); }}
      onChooseArea={(location) => { setPickedLocation(location); setPicking(false); }}
      onClose={stopCreating}
      onCreated={async (incident) => {
        stopCreating();
        setSelectedId(incident.id);
        setToast(incident.duplicates?.length ? "Saved. It may be a duplicate of a nearby report: check the card." : "Emergency saved. The AI is planning it now.");
        await load(); // show the new card straight away
        if (mode === "manual") {
          setPhoneView("plan");
          setToast("Emergency saved. Choose the vehicles in the Manual panel.");
          return;
        }
        // Agentic: the AI starts planning on its own. Nothing is sent until the dispatcher approves.
        await askAI({ trigger: "new_incident", incidentId: incident.id });
      }}
    />
  ) : (
    <EmergencyList incidents={incidents} resources={resources} selectedId={selectedId} onSelect={setSelectedId}
      onNew={() => { setCreating(true); setPickedLocation(null); setPhoneView("list"); }}
      onAnswered={(incident) => (mode === "manual" ? load() : askAI({ trigger: "manual", incidentId: incident.id }))} />
  );

  const right = mode === "manual" ? (
    <ManualTab incidents={incidents} resources={resources} selectedId={selectedId} onSelect={setSelectedId} onChanged={load} />
  ) : (
    <PlanTab plan={plan} incidents={incidents} resources={resources} thinking={thinking} steps={steps} planError={planError}
      onAskAI={askAI} onChanged={load} userName={userName} />
  );

  // Two ways to plan: the AI proposes, or the dispatcher picks everything by hand (always available).
  const modeSwitch = (
    <div className="flex rounded-xl bg-slate-100 p-1 text-sm font-medium" role="tablist" aria-label="Planning mode">
      {[["ai", "✨ AI"], ["manual", "✋ Manual"]].map(([value, label]) => (
        <button key={value} role="tab" aria-selected={mode === value} onClick={() => setMode(value)} disabled={thinking}
          className={`rounded-lg px-3.5 py-1.5 transition ${mode === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          {label}
        </button>
      ))}
    </div>
  );

  const map = (
    <div className="relative h-full w-full">
      <MapView incidents={incidents} resources={resources} selectedId={selectedId} onSelectIncident={setSelectedId}
        picking={picking} pickedLocation={pickedLocation}
        onPick={(point) => { setPickedLocation({ ...point, area: areaFor(point) }); setPicking(false); setPhoneView("list"); }} />
      {picking && (
        <div className="absolute left-1/2 top-4 z-[1000] flex -translate-x-1/2 items-center gap-3 rounded-full bg-slate-900 px-5 py-2.5 text-sm text-white shadow-xl">
          📍 Click where the emergency is
          <button onClick={() => setPicking(false)} className="rounded-full bg-white/15 px-3 py-0.5 hover:bg-white/25">Cancel</button>
        </div>
      )}
    </div>
  );

  return (
    <AppShell data={data}>
      {isDesktop ? (
        <div className="grid h-full grid-cols-[360px_1fr_420px] xl:grid-cols-[380px_1fr_460px]">
          <aside className="min-h-0 border-r border-slate-200 bg-slate-50">{left}</aside>
          <main className="min-h-0">{map}</main>
          <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-slate-50">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
              {modeSwitch}
              {mode === "ai" && plan?.status === "proposed" && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Waiting for you</span>}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{right}</div>
          </aside>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 gap-1 border-b border-slate-200 bg-white p-2">
            {PHONE_VIEWS.map(([key, label]) => (
              <button key={key} onClick={() => setPhoneView(key)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium ${phoneView === key ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}>
                {label}{key === "plan" && plan?.status === "proposed" ? " •" : ""}
              </button>
            ))}
          </div>
          {phoneView === "plan" && <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2">{modeSwitch}</div>}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {phoneView === "list" && left}
            {phoneView === "map" && <div className="h-full">{map}</div>}
            {phoneView === "plan" && right}
          </div>
        </div>
      )}
      {toast && <div className="fixed left-1/2 top-20 z-[2000] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-3 text-sm text-white shadow-xl">{toast}</div>}
    </AppShell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ControlRoom />
    </Suspense>
  );
}
