// Owner: Daksh
"use client";

import { useState } from "react";
import {
  approvePlan,
  rejectPlan,
  generatePlan,
  dispatchPlan,
} from "@/components/api";

export default function PlanPanel({
  currentPlan = null,
  logs = [],
  resources = [],
  incidents = [],
  onRefresh = () => {},
  loading = false,
  collapsed = false,
  onToggleCollapse = () => {},
}) {
  const [activeTab, setActiveTab] = useState("plan"); // 'plan' | 'timeline'
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState(null);
  const [conflictAlert, setConflictAlert] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  // Gate 2 sequence: approve -> dispatchPlan({ planId }) -> if committed: false, show conflicts & generate(trigger: 'resource_change')
  const handleApprove = async () => {
    if (!currentPlan || actionLoading) return;
    setActionLoading(true);
    setLoadingMessage("1/2 Approving plan...");
    setStatusMessage(null);
    setConflictAlert(null);

    const appRes = await approvePlan(currentPlan.id, {
      note: "Approved by dispatcher for field execution",
    });

    if (!appRes.ok) {
      setStatusMessage({
        type: "error",
        text: appRes.error?.message || "Failed to approve plan",
        onRetry: () => handleApprove(),
      });
      setActionLoading(false);
      setLoadingMessage("");
      return;
    }

    setLoadingMessage("2/2 Committing plan and dispatching units...");
    const dispRes = await dispatchPlan({ planId: currentPlan.id });

    if (dispRes.ok) {
      if (dispRes.data?.committed) {
        setStatusMessage({
          type: "success",
          text: `✓ Plan v${currentPlan.version} committed! Units dispatched and en route.`,
        });
        await onRefresh();
      } else if (dispRes.data?.conflicts) {
        // If committed: false, show conflicts and auto-generate with trigger resource_change
        setConflictAlert(dispRes.data.conflicts);
        setStatusMessage({
          type: "warning",
          text: "Unit availability changed! Re-evaluating optimal assignments...",
        });
        setLoadingMessage("Resolving conflicts via Gemini replanning (trigger: resource_change)...");
        await generatePlan({ trigger: "resource_change" });
        await onRefresh();
      }
    } else {
      setStatusMessage({
        type: "error",
        text: dispRes.error?.message || "Failed to commit dispatch plan",
        onRetry: () => handleApprove(),
      });
    }
    setActionLoading(false);
    setLoadingMessage("");
  };

  const handleReject = async () => {
    if (!currentPlan || actionLoading) return;
    setActionLoading(true);
    setLoadingMessage("Rejecting plan...");
    const res = await rejectPlan(currentPlan.id, { note: rejectNote.trim() || "" });
    if (res.ok) {
      setStatusMessage({
        type: "info",
        text: `Plan v${currentPlan.version} marked as rejected.`,
      });
      setRejectModal(false);
      setRejectNote("");
      await onRefresh();
    } else {
      setStatusMessage({
        type: "error",
        text: res.error?.message || "Failed to reject plan",
        onRetry: () => handleReject(),
      });
    }
    setActionLoading(false);
    setLoadingMessage("");
  };

  const handleGenerate = async (trigger = "manual") => {
    if (actionLoading) return;
    setActionLoading(true);
    setLoadingMessage("Synthesizing multi-agent dispatch plan (~3–8s)...");
    setStatusMessage(null);
    setConflictAlert(null);
    const res = await generatePlan({ trigger });
    if (res.ok) {
      setStatusMessage({
        type: "success",
        text: `AI Plan v${res.data?.plan?.version || "New"} synthesized successfully.`,
      });
    } else {
      setStatusMessage({
        type: "error",
        text: res.error?.message || "Plan generation failed",
        onRetry: () => handleGenerate(trigger),
      });
    }
    await onRefresh();
    setActionLoading(false);
    setLoadingMessage("");
  };

  const resourceMap = new Map(resources.map((r) => [r.id, r]));
  const incidentMap = new Map(incidents.map((i) => [i.id, i]));

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="absolute top-20 right-4 z-20 bg-white shadow-2xl rounded-full px-4 py-2.5 border border-neutral-200 text-xs font-bold text-black flex items-center gap-2 hover:bg-neutral-50 transition"
      >
        <span>⚡ Dispatch Plan {currentPlan ? `(v${currentPlan.version})` : ""}</span>
      </button>
    );
  }

  return (
    <div className="absolute top-20 right-4 bottom-6 z-20 w-80 sm:w-96 lg:w-[410px] bg-white/95 backdrop-blur-md rounded-3xl border border-neutral-200/90 shadow-2xl flex flex-col overflow-hidden font-sans select-none">
      {/* Top Header & Tab Pills */}
      <div className="p-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full text-xs font-bold">
          <button
            onClick={() => setActiveTab("plan")}
            className={`px-3.5 py-1.5 rounded-full transition ${
              activeTab === "plan"
                ? "bg-black text-white shadow-sm"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            Dispatch Plan
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${
              activeTab === "timeline"
                ? "bg-black text-white shadow-sm"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            <span>Agent Logs</span>
            {logs.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleGenerate}
            disabled={actionLoading}
            className="px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition disabled:opacity-50"
            title="Trigger AI multi-agent replanning"
          >
            {actionLoading ? "Thinking..." : "Replan"}
          </button>
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs transition"
            title="Minimize plan"
          >
            ❯
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center justify-between border ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : statusMessage.type === "warning"
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : statusMessage.type === "info"
                ? "bg-blue-50 text-blue-900 border-blue-200"
                : "bg-red-50 text-red-900 border-red-200"
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="shrink-0">
                {statusMessage.type === "success"
                  ? "✓"
                  : statusMessage.type === "warning"
                  ? "⚠️"
                  : statusMessage.type === "info"
                  ? "ℹ"
                  : "✕"}
              </span>
              <span className="font-medium break-words leading-tight">{statusMessage.text}</span>
            </div>
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              {statusMessage.onRetry && (
                <button
                  onClick={statusMessage.onRetry}
                  className="px-2.5 py-1 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-[11px] shadow-sm transition"
                >
                  Try again
                </button>
              )}
              <button
                onClick={() => setStatusMessage(null)}
                className="text-neutral-400 hover:text-neutral-700 text-xs font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Dispatch Conflict Alert (with replanning trigger: resource_change info) */}
        {conflictAlert && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 text-xs space-y-1.5 shadow-sm">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Dispatch Conflict Detected (Replanning Triggered)</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-snug">
              Units became unavailable during dispatch. Auto-triggering replan (trigger: resource_change):
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-900">
              {conflictAlert.map((c, i) => (
                <li key={i}>
                  <strong>{resourceMap.get(c.resourceId)?.name || c.resourceId}:</strong> {c.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Loading Progress Indicator */}
        {actionLoading && loadingMessage && (
          <div className="bg-neutral-900 text-white rounded-2xl p-3 text-xs flex items-center gap-2.5 animate-pulse shadow-md">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />
            <span className="font-medium text-[11px]">{loadingMessage}</span>
          </div>
        )}

        {activeTab === "plan" ? (
          <div>
            {!currentPlan ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-xl">
                  ⚡
                </div>
                <h3 className="font-bold text-sm text-black mb-1">
                  No Active Plan
                </h3>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto mb-4">
                  Run the multi-agent orchestration engine to optimize unit assignments.
                </p>
                <button
                  onClick={() => handleGenerate("manual")}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-full bg-black text-white font-bold text-xs shadow-lg"
                >
                  Generate Plan
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Plan Overview Card */}
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-black tracking-tight">
                        Plan v{currentPlan.version}
                      </span>
                      <span className="text-[11px] font-medium text-neutral-500">
                        ({currentPlan.trigger})
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
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

                  <p className="text-xs text-neutral-700 leading-relaxed font-normal">
                    {currentPlan.summary}
                  </p>
                </div>

                {/* Unit Assignments (Uber trip style) */}
                <div>
                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                    Assignments ({currentPlan.assignments?.length || 0})
                  </h4>

                  <div className="space-y-2">
                    {currentPlan.assignments?.map((a, idx) => {
                      const res = resourceMap.get(a.resourceId);
                      const inc = incidentMap.get(a.incidentId);
                      const dest = a.destinationId ? resourceMap.get(a.destinationId) : null;

                      return (
                        <div
                          key={idx}
                          className="bg-white border border-neutral-200 rounded-2xl p-3 shadow-sm hover:border-black transition"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">🚑</span>
                              <span className="font-bold text-xs text-black">
                                {res ? res.name : a.resourceId.slice(0, 8)}
                              </span>
                            </div>

                            <span className="px-2.5 py-1 rounded-full bg-black text-white text-[11px] font-bold">
                              {a.etaMinutes} min • {a.distanceKm} km
                            </span>
                          </div>

                          <div className="pl-6 space-y-1 text-xs text-neutral-700">
                            <div>
                              ➔ Dispatched to{" "}
                              <strong className="text-black">
                                {inc?.code || "Incident"}
                              </strong>{" "}
                              ({inc?.location?.area || "Target Area"})
                            </div>

                            {dest && (
                              <div className="text-indigo-600 font-medium text-[11px]">
                                Hospital routing: {dest.name}
                              </div>
                            )}

                            <p className="text-[11px] text-neutral-500 italic mt-1">
                              &quot;{a.reason}&quot;
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Uncovered Warning Alert */}
                {currentPlan.uncovered?.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                    <div className="text-xs font-bold text-[#e11900] mb-1 flex items-center gap-1.5">
                      <span>⚠️ Resource Shortage / Uncovered</span>
                    </div>
                    {currentPlan.uncovered.map((u, i) => (
                      <div key={i} className="text-xs text-neutral-800">
                        <strong>{incidentMap.get(u.incidentId)?.code || "Incident"}:</strong>{" "}
                        {u.reason} (ETA delay: ~{u.expectedDelayMinutes} min)
                      </div>
                    ))}
                  </div>
                )}

                {/* Alternatives */}
                {currentPlan.alternatives?.length > 0 && (
                  <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-3 text-xs">
                    <div className="text-[10px] font-bold uppercase text-neutral-500 mb-1">
                      Alternative Trade-off Evaluated
                    </div>
                    {currentPlan.alternatives.map((alt, i) => (
                      <div key={i} className="space-y-0.5">
                        <div className="font-medium text-neutral-800">{alt.summary}</div>
                        <div className="text-[11px] text-amber-700">
                          Trade-off: {alt.tradeoff}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dispatcher Actions */}
                {currentPlan.status === "proposed" && (
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="flex-1 py-3 rounded-full bg-black hover:bg-neutral-800 active:scale-95 text-white text-xs font-bold tracking-tight shadow-xl transition disabled:opacity-50"
                    >
                      {actionLoading ? "Dispatching..." : "Approve & Dispatch"}
                    </button>
                    <button
                      onClick={() => setRejectModal(true)}
                      disabled={actionLoading}
                      className="px-5 py-3 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Agent Timeline Tab */
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              Multi-Agent Orchestration Log
            </h4>
            {logs.length === 0 ? (
              <div className="text-xs text-neutral-400 py-12 text-center">
                No logs generated yet.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold uppercase px-2 py-0.5 rounded-full bg-black text-white text-[10px]">
                      {log.agent}
                    </span>
                    <span className="text-neutral-400">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-neutral-700 leading-snug">{log.message}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Reject Feedback Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-neutral-100">
            <h3 className="text-base font-extrabold text-black">
              Reject Dispatch Plan
            </h3>
            <p className="text-xs text-neutral-600">
              Provide feedback for the AI agents to explain why this plan is being rejected (optional):
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Reserve SDRF Alpha for structural collapse zone... (optional)"
              className="w-full h-24 bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-xs text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
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
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-full bg-[#e11900] hover:bg-red-700 text-white disabled:opacity-50"
              >
                {actionLoading ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
