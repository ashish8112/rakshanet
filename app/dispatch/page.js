// Owner: Daksh
"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import ReportModal from "@/components/ReportModal";
import {
  getCurrentPlan,
  getResources,
  getIncidents,
  approvePlan,
  rejectPlan,
  generatePlan,
} from "@/components/api";

export default function DispatchPage() {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [resources, setResources] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [isReportOpen, setIsReportOpen] = useState(false);

  const loadData = () => {
    Promise.all([getCurrentPlan(), getResources(), getIncidents()]).then(
      ([pRes, rRes, iRes]) => {
        if (pRes.ok) setCurrentPlan(pRes.data);
        if (rRes.ok) setResources(rRes.data || []);
        if (iRes.ok) setIncidents(iRes.data || []);
      }
    );
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([getCurrentPlan(), getResources(), getIncidents()]).then(
      ([pRes, rRes, iRes]) => {
        if (!ignore) {
          if (pRes.ok) setCurrentPlan(pRes.data);
          if (rRes.ok) setResources(rRes.data || []);
          if (iRes.ok) setIncidents(iRes.data || []);
        }
      }
    );
    return () => {
      ignore = true;
    };
  }, []);

  const resourceMap = new Map(resources.map((r) => [r.id, r]));
  const incidentMap = new Map(incidents.map((i) => [i.id, i]));

  const handleApprove = async () => {
    if (!currentPlan || loading) return;
    setLoading(true);
    await approvePlan(currentPlan.id, { note: "Approved via Dispatch screen" });
    loadData();
    setLoading(false);
  };

  const handleReject = async () => {
    if (!currentPlan || loading || !rejectNote.trim()) return;
    setLoading(true);
    await rejectPlan(currentPlan.id, { note: rejectNote });
    setRejectModal(false);
    setRejectNote("");
    loadData();
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    await generatePlan({ trigger: "manual" });
    loadData();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-neutral-900 font-sans flex flex-col">
      <Navbar onOpenReport={() => setIsReportOpen(true)} onRefresh={loadData} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <h1 className="text-2xl font-extrabold text-black tracking-tight">
                AI Dispatch Command Center
              </h1>
            </div>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Review multi-agent vehicle assignments, route ETAs, and approve dispatches
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold border border-neutral-300 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {loading ? "Re-evaluating..." : "⚡ Run AI Replanning"}
            </button>
          </div>
        </div>

        {!currentPlan ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-neutral-200 shadow-sm">
            <span className="text-3xl mb-2 block">⚡</span>
            <h3 className="font-bold text-sm text-black">No Active Plan Found</h3>
            <p className="text-xs text-neutral-500 max-w-md mx-auto my-3">
              Generate an initial dispatch plan using our Gemini multi-agent system.
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-5 py-2.5 rounded-full bg-black text-white text-xs font-bold shadow-lg"
            >
              Generate AI Plan
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Plan Header Card */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg font-black text-black">
                    Plan Version {currentPlan.version}
                  </span>
                  <span className="text-xs font-medium text-neutral-500">
                    Triggered by: <strong>{currentPlan.trigger}</strong>
                  </span>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                    currentPlan.status === "committed"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : currentPlan.status === "approved"
                      ? "bg-blue-100 text-blue-800 border-blue-300"
                      : currentPlan.status === "rejected"
                      ? "bg-red-100 text-red-800 border-red-300"
                      : "bg-amber-100 text-amber-900 border-amber-300"
                  }`}
                >
                  {currentPlan.status}
                </span>
              </div>

              <p className="text-sm text-neutral-800 leading-relaxed font-medium bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                {currentPlan.summary}
              </p>

              <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
                <span>Created: {new Date(currentPlan.createdAt).toLocaleString()}</span>
                {currentPlan.dispatcherNote && (
                  <span className="text-neutral-700 italic">
                    Dispatcher note: &quot;{currentPlan.dispatcherNote}&quot;
                  </span>
                )}
              </div>
            </div>

            {/* Assignments List */}
            <div>
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
                Recommended Unit Allocations ({currentPlan.assignments?.length || 0})
              </h3>

              <div className="space-y-3">
                {currentPlan.assignments?.map((a, idx) => {
                  const res = resourceMap.get(a.resourceId);
                  const inc = incidentMap.get(a.incidentId);
                  const dest = a.destinationId ? resourceMap.get(a.destinationId) : null;

                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🚑</span>
                          <span className="font-extrabold text-sm text-black">
                            {res?.name || a.resourceId}
                          </span>
                          <span className="text-xs font-mono text-neutral-400">
                            ({res?.code})
                          </span>
                        </div>

                        <div className="text-xs text-neutral-700">
                          Dispatched to{" "}
                          <strong className="text-black">
                            {inc?.code || "Incident"}
                          </strong>{" "}
                          in <strong>{inc?.location?.area || "Target Area"}</strong>
                        </div>

                        {dest && (
                          <div className="text-xs text-indigo-600 font-semibold">
                            Hospital destination: {dest.name} ({dest.location?.area})
                          </div>
                        )}

                        <p className="text-xs text-neutral-500 italic mt-1">
                          &quot;{a.reason}&quot;
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-base font-extrabold text-black">
                            {a.etaMinutes} min ETA
                          </div>
                          <div className="text-xs text-neutral-500 font-medium">
                            {a.distanceKm} km away
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shortage Warnings */}
            {currentPlan.uncovered?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-3xl p-5">
                <h4 className="text-xs font-bold text-[#e11900] uppercase tracking-wider mb-2">
                  ⚠️ Resource Capability Deficit Detected
                </h4>
                {currentPlan.uncovered.map((u, i) => (
                  <div key={i} className="text-xs text-neutral-800">
                    <strong>{incidentMap.get(u.incidentId)?.code || "Incident"}:</strong>{" "}
                    {u.reason} (Expected delay: ~{u.expectedDelayMinutes} min)
                  </div>
                ))}
              </div>
            )}

            {/* Action Bar */}
            {currentPlan.status === "proposed" && (
              <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-lg flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-extrabold text-sm text-black">
                    Ready to Dispatch?
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Approving commits this plan and notifies all units to proceed immediately.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRejectModal(true)}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-full bg-black hover:bg-neutral-800 active:scale-95 text-white text-xs font-bold shadow-xl transition disabled:opacity-50"
                  >
                    Approve & Dispatch Units
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-3 shadow-2xl border border-neutral-100">
            <h3 className="text-base font-extrabold text-black">
              Reject Dispatch Plan
            </h3>
            <p className="text-xs text-neutral-600">
              Provide feedback for the AI agents to explain why this plan is rejected:
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Reserve SDRF Alpha for structural collapse zone..."
              className="w-full h-24 bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-xs text-black focus:outline-none focus:border-black"
            />
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button
                onClick={() => setRejectModal(false)}
                className="px-4 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectNote.trim()}
                className="px-5 py-2.5 rounded-full bg-[#e11900] text-white disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
