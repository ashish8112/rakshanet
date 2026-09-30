// Owner: Daksh
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ReportModal from "@/components/ReportModal";
import { getResources, updateResponder, generatePlan } from "@/components/api";

export default function FleetPage() {
  const [resources, setResources] = useState([]);
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [replanNotice, setReplanNotice] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const loadData = () => {
    getResources().then((res) => {
      if (res.ok) setResources(res.data || []);
    });
  };

  useEffect(() => {
    let ignore = false;
    getResources().then((res) => {
      if (!ignore && res.ok) {
        setResources(res.data || []);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  const handleResponderEvent = async (resourceId, event) => {
    if (updatingId) return;
    setUpdatingId(resourceId);
    setReplanNotice(null);

    const res = await updateResponder({ resourceId, event });
    if (res.ok) {
      if (res.data?.replanNeeded) {
        setReplanNotice(`Unit status updated to ${event}. Auto-triggering AI replanning (trigger: responder_update)...`);
        await generatePlan({ trigger: "responder_update", resourceId });
        setReplanNotice(`✓ Replan complete! New plan synthesized based on ${event} event.`);
      }
      loadData();
    }
    setUpdatingId(null);
  };

  const filteredResources = useMemo(() => {
    if (filter === "all") return resources;
    return resources.filter((r) => r.kind === filter);
  }, [resources, filter]);

  const totalBeds = resources
    .filter((r) => r.kind === "hospital")
    .reduce((sum, h) => sum + (h.capacity?.total || 0), 0);
  const usedBeds = resources
    .filter((r) => r.kind === "hospital")
    .reduce((sum, h) => sum + (h.capacity?.used || 0), 0);

  const availableUnits = resources.filter(
    (r) =>
      r.status === "available" &&
      ["ambulance", "fire_unit", "rescue_team"].includes(r.kind)
  ).length;

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-neutral-900 font-sans flex flex-col">
      <Navbar onOpenReport={() => setIsReportOpen(true)} onRefresh={loadData} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚑</span>
              <h1 className="text-2xl font-extrabold text-black tracking-tight">
                Emergency Fleet & Hospital Network
              </h1>
            </div>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Live status, bed capacities, and responder state simulation
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-xs font-bold">
            <div className="bg-white px-4 py-2 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{availableUnits} Units Available</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{totalBeds - usedBeds} / {totalBeds} Beds Free</span>
            </div>
          </div>
        </div>

        {/* Replan Notification Banner */}
        {replanNotice && (
          <div className="bg-neutral-900 text-white p-4 rounded-3xl mb-6 text-xs flex items-center justify-between shadow-lg border border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="text-base animate-pulse">⚡</span>
              <span>{replanNotice}</span>
            </div>
            <Link
              href="/dispatch"
              className="px-3 py-1 rounded-full bg-white text-black font-bold text-[11px] shrink-0"
            >
              View Dispatch Plan →
            </Link>
          </div>
        )}

        {/* Filter Chips */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              filter === "all"
                ? "bg-black text-white shadow-sm"
                : "bg-white text-neutral-600 hover:text-black border border-neutral-200"
            }`}
          >
            All Resources ({resources.length})
          </button>
          <button
            onClick={() => setFilter("ambulance")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              filter === "ambulance"
                ? "bg-black text-white shadow-sm"
                : "bg-white text-neutral-600 hover:text-black border border-neutral-200"
            }`}
          >
            🚑 Ambulances
          </button>
          <button
            onClick={() => setFilter("fire_unit")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              filter === "fire_unit"
                ? "bg-black text-white shadow-sm"
                : "bg-white text-neutral-600 hover:text-black border border-neutral-200"
            }`}
          >
            🚒 Fire Tenders
          </button>
          <button
            onClick={() => setFilter("rescue_team")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              filter === "rescue_team"
                ? "bg-black text-white shadow-sm"
                : "bg-white text-neutral-600 hover:text-black border border-neutral-200"
            }`}
          >
            🛟 Rescue Teams
          </button>
          <button
            onClick={() => setFilter("hospital")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              filter === "hospital"
                ? "bg-black text-white shadow-sm"
                : "bg-white text-neutral-600 hover:text-black border border-neutral-200"
            }`}
          >
            🏥 Hospitals
          </button>
          <button
            onClick={() => setFilter("shelter")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              filter === "shelter"
                ? "bg-black text-white shadow-sm"
                : "bg-white text-neutral-600 hover:text-black border border-neutral-200"
            }`}
          >
            ⛺ Relief Shelters
          </button>
        </div>

        {/* Resources Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((res) => {
            let symbol = "🚑";
            if (res.kind === "fire_unit") symbol = "🚒";
            if (res.kind === "rescue_team") symbol = "🛟";
            if (res.kind === "hospital") symbol = "🏥";
            if (res.kind === "shelter") symbol = "⛺";

            const isMobileUnit = ["ambulance", "fire_unit", "rescue_team"].includes(res.kind);
            const isBusy = updatingId === res.id;

            return (
              <div
                key={res.id}
                className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-xl shadow-inner">
                        {symbol}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-black tracking-tight">
                          {res.name}
                        </h3>
                        <span className="text-[11px] font-mono text-neutral-500">
                          {res.code}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        res.status === "available"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : res.status === "en_route"
                          ? "bg-blue-50 text-blue-800 border-blue-300"
                          : res.status === "on_scene"
                          ? "bg-red-50 text-red-800 border-red-300"
                          : "bg-neutral-100 text-neutral-600 border-neutral-300"
                      }`}
                    >
                      {res.status?.replace("_", " ")}
                    </span>
                  </div>

                  {/* Location Area */}
                  <div className="text-xs text-neutral-600 mb-3 flex items-center gap-1.5">
                    <span>📍</span>
                    <span className="font-semibold text-neutral-900">
                      {res.location?.area}
                    </span>
                  </div>

                  {/* Hospital/Shelter Capacity Meter */}
                  {res.capacity && (
                    <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100 mb-2">
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-neutral-600">Bed Capacity:</span>
                        <span className="text-black font-bold">
                          {res.capacity.total - res.capacity.used} free / {res.capacity.total} total
                        </span>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{
                            width: `${(res.capacity.used / res.capacity.total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Capabilities Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {res.capabilities?.map((c, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-neutral-100 text-neutral-600"
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  {/* Step 2.4 Responder Simulator Buttons */}
                  {isMobileUnit && (
                    <div className="pt-2 border-t border-neutral-100 mt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                        Simulate Responder Action:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
                        <button
                          onClick={() => handleResponderEvent(res.id, "arrived")}
                          disabled={isBusy || res.status === "on_scene"}
                          className="py-1.5 px-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 transition text-neutral-800 text-center"
                        >
                          Arrived
                        </button>
                        <button
                          onClick={() => handleResponderEvent(res.id, "unavailable")}
                          disabled={isBusy || res.status === "unavailable"}
                          className="py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 disabled:opacity-40 transition text-center"
                        >
                          Unavailable
                        </button>
                        <button
                          onClick={() => handleResponderEvent(res.id, "available")}
                          disabled={isBusy || res.status === "available"}
                          className="py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 disabled:opacity-40 transition text-center"
                        >
                          Available
                        </button>
                        <button
                          onClick={() => handleResponderEvent(res.id, "cleared")}
                          disabled={isBusy}
                          className="py-1.5 px-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 transition text-neutral-800 text-center"
                        >
                          Cleared
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>Coordinates: {res.location?.lat}, {res.location?.lng}</span>
                  <span className="font-semibold text-neutral-700 capitalize">
                    {res.kind?.replace("_", " ")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
