// Owner: Daksh
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ReportModal from "@/components/ReportModal";
import {
  getCurrentPlan,
  getResources,
  getIncidents,
  approvePlan,
  dispatchPlan,
  rejectPlan,
  editPlan,
  generatePlan,
} from "@/components/api";

export default function DispatchPage() {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [resources, setResources] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState(null);
  const [conflictAlert, setConflictAlert] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [editModal, setEditModal] = useState(false);
  const [editAssignments, setEditAssignments] = useState([]);
  const [editNote, setEditNote] = useState("");
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

  // Sequence: Approve -> POST /api/dispatch with { planId }
  const handleApproveAndDispatch = async () => {
    if (!currentPlan || loading) return;
    setLoading(true);
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
      });
      setLoading(false);
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
        loadData();
      } else if (dispRes.data?.conflicts) {
        // If committed: false, show conflicts and auto-generate with trigger resource_change
        setConflictAlert(dispRes.data.conflicts);
        setStatusMessage({
          type: "warning",
          text: "Unit availability changed! Re-evaluating optimal assignments...",
        });
        setLoadingMessage("Resolving conflicts via Gemini replanning (trigger: resource_change)...");
        await generatePlan({ trigger: "resource_change" });
        loadData();
      }
    } else {
      setStatusMessage({
        type: "error",
        text: dispRes.error?.message || "Failed to commit dispatch plan",
      });
    }
    setLoading(false);
  };

  // Reject plan (note is optional per CONTRACT.md)
  const handleReject = async () => {
    if (!currentPlan || loading) return;
    setLoading(true);
    setLoadingMessage("Rejecting plan...");
    const res = await rejectPlan(currentPlan.id, { note: rejectNote.trim() || "" });
    if (res.ok) {
      setStatusMessage({
        type: "info",
        text: `Plan v${currentPlan.version} marked as rejected.`,
      });
      setRejectModal(false);
      setRejectNote("");
      loadData();
    } else {
      setStatusMessage({
        type: "error",
        text: res.error?.message || "Failed to reject plan",
      });
    }
    setLoading(false);
  };

  // Open Edit Modal with current assignments
  const handleOpenEdit = () => {
    if (!currentPlan) return;
    setEditAssignments(
      (currentPlan.assignments || []).map((a) => ({
        resourceId: a.resourceId,
        incidentId: a.incidentId,
        destinationId: a.destinationId || null,
        reason: a.reason || "Manual dispatcher intervention",
      }))
    );
    setEditNote("");
    setEditModal(true);
  };

  // Submit manual edit -> returns NEW plan version with changes list
  const handleSaveEdit = async () => {
    if (!currentPlan || loading) return;
    setLoading(true);
    setLoadingMessage("Submitting manual edit and computing routes...");
    const res = await editPlan(currentPlan.id, {
      assignments: editAssignments,
      note: editNote.trim() || "Dispatcher adjusted allocations",
    });

    if (res.ok) {
      setStatusMessage({
        type: "success",
        text: `New Plan v${res.data?.version || ""} generated with manual overrides.`,
      });
      setEditModal(false);
      loadData();
    } else {
      setStatusMessage({
        type: "error",
        text: res.error?.message || "Failed to edit plan",
      });
    }
    setLoading(false);
  };

  // Generate initial or replanned plan
  const handleGenerate = async (trigger = "manual") => {
    if (loading) return;
    setLoading(true);
    setLoadingMessage("Gemini multi-agent system analyzing city incidents and fleet logistics (takes ~3–8s)...");
    setStatusMessage(null);
    setConflictAlert(null);
    const res = await generatePlan({ trigger });
    if (res.ok) {
      setStatusMessage({
        type: "success",
        text: `AI Plan synthesized successfully (Version ${res.data?.plan?.version || "New"}).`,
      });
      loadData();
    } else {
      setStatusMessage({
        type: "error",
        text: res.error?.message || "Plan generation failed",
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-neutral-900 font-sans flex flex-col">
      <Navbar onOpenReport={() => setIsReportOpen(true)} onRefresh={loadData} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <h1 className="text-2xl font-extrabold text-black tracking-tight">
                AI Dispatch Command Center
              </h1>
            </div>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Review multi-agent vehicle allocations, verify route ETAs, and approve dispatches
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={currentPlan ? `/logs?planVersion=${currentPlan.version}` : "/logs"}
              className="px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold border border-neutral-300 shadow-sm transition flex items-center gap-1.5"
            >
              <span>🧠</span>
              <span>View Agent Reasoning</span>
            </Link>
            <button
              onClick={() => handleGenerate("manual")}
              disabled={loading}
              className="px-4 py-2 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>{loading ? "Synthesizing..." : "Generate AI Plan"}</span>
            </button>
          </div>
        </div>

        {/* Global Loading Banner with Multi-Agent Feedback */}
        {loading && (
          <div className="bg-neutral-900 text-white rounded-3xl p-5 shadow-2xl mb-6 flex items-center justify-between animate-pulse border border-neutral-800">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full border-3 border-white border-t-transparent animate-spin shrink-0" />
              <div>
                <div className="font-extrabold text-xs text-white">
                  Multi-Agent Orchestration in Progress
                </div>
                <p className="text-[11px] text-neutral-300">
                  {loadingMessage || "Assessing severity, matching capabilities, and computing city routes..."}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-neutral-400 shrink-0 hidden sm:inline">
              ~3–8s execution
            </span>
          </div>
        )}

        {/* Status Message Alerts */}
        {statusMessage && (
          <div
            className={`p-4 rounded-3xl mb-6 text-xs font-semibold flex items-center justify-between border ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : statusMessage.type === "warning"
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : statusMessage.type === "error"
                ? "bg-red-50 text-[#e11900] border-red-200"
                : "bg-blue-50 text-blue-900 border-blue-200"
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-neutral-500 hover:text-black font-bold text-xs ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Conflict Alert (Committed: False) */}
        {conflictAlert && (
          <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">⚠️</span>
              <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                Resource Conflict Detected Prior to Dispatch
              </h4>
            </div>
            <p className="text-xs text-amber-800 mb-3">
              One or more units changed state while reviewing. Automatic replanning was triggered.
            </p>
            <div className="space-y-1">
              {conflictAlert.map((c, i) => (
                <div key={i} className="text-xs text-amber-950 font-medium">
                  • <strong>{resourceMap.get(c.resourceId)?.name || c.resourceId}:</strong> {c.reason}
                </div>
              ))}
            </div>
          </div>
        )}

        {!currentPlan ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-neutral-200 shadow-sm">
            <span className="text-4xl mb-3 block">⚡</span>
            <h3 className="font-extrabold text-sm text-black">No Active Plan Found</h3>
            <p className="text-xs text-neutral-500 max-w-md mx-auto my-3 leading-relaxed">
              Generate an emergency response plan using our Gemini multi-agent pipeline to automatically assign available ambulances, fire engines, and rescue teams.
            </p>
            <button
              onClick={() => handleGenerate("manual")}
              disabled={loading}
              className="px-6 py-3 rounded-full bg-black text-white text-xs font-bold shadow-xl hover:bg-neutral-800 transition"
            >
              Generate AI Dispatch Plan (~3–8s)
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Plan Header Card */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-black">
                    Plan Version {currentPlan.version}
                  </span>
                  <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                    Trigger: <strong>{currentPlan.trigger}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
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
                    ● {currentPlan.status}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-medium bg-neutral-50 p-4 rounded-2xl border border-neutral-100 mb-3">
                {currentPlan.summary}
              </p>

              {/* What Changed & Why Section (Section 3.1 & Ashish requirement) */}
              {currentPlan.changes && currentPlan.changes.length > 0 && (
                <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 my-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">📝</span>
                    <h4 className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                      What Changed &amp; Why (Plan History)
                    </h4>
                  </div>
                  <div className="space-y-1.5">
                    {currentPlan.changes.map((c, i) => (
                      <div key={i} className="text-xs text-blue-950 flex items-start gap-2">
                        <span className="text-blue-500 font-bold">•</span>
                        <div>
                          <strong>{c.what}</strong>
                          {c.why && (
                            <span className="text-blue-700 ml-1.5 italic">
                              — {c.why}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-neutral-400 gap-2 pt-2 border-t border-neutral-100">
                <span>Created: {new Date(currentPlan.createdAt).toLocaleString()}</span>
                {currentPlan.dispatcherNote && (
                  <span className="text-neutral-700 italic">
                    Note: &quot;{currentPlan.dispatcherNote}&quot;
                  </span>
                )}
              </div>
            </div>

            {/* Assignments List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Recommended Unit Allocations ({currentPlan.assignments?.length || 0})
                </h3>
                {currentPlan.status === "proposed" && (
                  <button
                    onClick={handleOpenEdit}
                    className="text-xs font-bold text-neutral-700 hover:text-black flex items-center gap-1"
                  >
                    <span>✏️</span>
                    <span>Edit Allocations</span>
                  </button>
                )}
              </div>

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
                          <span className="text-base">
                            {res?.kind === "fire_unit"
                              ? "🚒"
                              : res?.kind === "rescue_team"
                              ? "🛟"
                              : "🚑"}
                          </span>
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
                          <div className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5">
                            <span>🏥 Destination Hospital:</span>
                            <span>{dest.name} ({dest.location?.area})</span>
                          </div>
                        )}

                        <p className="text-xs text-neutral-500 italic mt-1">
                          &quot;{a.reason}&quot;
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-base font-extrabold text-black">
                            ~{a.etaMinutes} min ETA
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

            {/* Shortage Warnings (Uncovered Incidents) */}
            {currentPlan.uncovered && currentPlan.uncovered.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">⚠️</span>
                  <h4 className="text-xs font-bold text-[#e11900] uppercase tracking-wider">
                    Resource Capability Deficit Detected ({currentPlan.uncovered.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {currentPlan.uncovered.map((u, i) => (
                    <div key={i} className="text-xs text-neutral-800">
                      <strong>{incidentMap.get(u.incidentId)?.code || u.incidentId}:</strong>{" "}
                      {u.reason}{" "}
                      {u.expectedDelayMinutes && (
                        <span className="text-[#e11900] font-bold">
                          (Expected delay: ~{u.expectedDelayMinutes} mins)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternative Scenarios Evaluated by AI */}
            {currentPlan.alternatives && currentPlan.alternatives.length > 0 && (
              <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🔄</span>
                  <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                    Alternative Scenarios Evaluated
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentPlan.alternatives.map((alt, i) => (
                    <div key={i} className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs">
                      <div className="font-bold text-black mb-1">{alt.name || `Scenario ${i + 1}`}</div>
                      <p className="text-neutral-600 text-[11px] leading-relaxed mb-2">{alt.description}</p>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        Avg ETA: {alt.averageEtaMinutes ? `${alt.averageEtaMinutes}m` : "N/A"} • Coverage: {alt.coveragePercent ? `${alt.coveragePercent}%` : "100%"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar (Proposed state) */}
            {currentPlan.status === "proposed" && (
              <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-extrabold text-sm text-black">
                    Ready to Dispatch to Field?
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Approving triggers immediate execution and dispatches units en route across Bengaluru.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setRejectModal(true)}
                    disabled={loading}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleOpenEdit}
                    disabled={loading}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleApproveAndDispatch}
                    disabled={loading}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-full bg-black hover:bg-neutral-800 active:scale-95 text-white text-xs font-bold shadow-xl transition disabled:opacity-50"
                  >
                    Approve &amp; Dispatch Units
                  </button>
                </div>
              </div>
            )}

            {/* Committed State Banner */}
            {currentPlan.status === "committed" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✓</span>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">
                      Plan Dispatched &amp; Live in Field
                    </h4>
                    <p className="text-xs text-emerald-700">
                      All units have been committed. View their live vector routes on the operations map.
                    </p>
                  </div>
                </div>
                <Link
                  href="/"
                  className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition shrink-0"
                >
                  Track on Map →
                </Link>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reject Modal (Note is optional) */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-3 shadow-2xl border border-neutral-100 font-sans">
            <h3 className="text-base font-extrabold text-black">
              Reject Dispatch Plan
            </h3>
            <p className="text-xs text-neutral-600">
              Provide optional feedback for the AI agents explaining why this plan is rejected:
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Reserve SDRF boat team for structural collapse zone (optional)..."
              className="w-full h-24 bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-xs text-black focus:outline-none focus:border-black"
            />
            <div className="flex justify-end gap-2 text-xs font-bold pt-1">
              <button
                onClick={() => setRejectModal(false)}
                className="px-4 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-5 py-2.5 rounded-full bg-[#e11900] hover:bg-red-700 text-white shadow"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-neutral-100 font-sans max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-black">
                  Edit Plan Allocations (v{currentPlan?.version})
                </h3>
                <p className="text-xs text-neutral-500">
                  Adjust unit assignments manually. A new version will be created with changes logged.
                </p>
              </div>
              <button
                onClick={() => setEditModal(false)}
                className="text-neutral-400 hover:text-black font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {editAssignments.map((assignment, index) => {
                const res = resourceMap.get(assignment.resourceId);
                return (
                  <div key={index} className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-black">{res?.name || assignment.resourceId}</span>
                      <span className="text-[10px] font-mono text-neutral-400 uppercase">{res?.kind}</span>
                    </div>

                    <div>
                      <span className="text-[11px] text-neutral-500 block mb-1">Reassign to Incident:</span>
                      <select
                        value={assignment.incidentId}
                        onChange={(e) => {
                          const updated = [...editAssignments];
                          updated[index].incidentId = e.target.value;
                          setEditAssignments(updated);
                        }}
                        className="w-full bg-white border border-neutral-200 rounded-xl p-2 text-xs font-semibold text-black focus:outline-none focus:border-black"
                      >
                        {incidents.map((inc) => (
                          <option key={inc.id} value={inc.id}>
                            {inc.code} — {inc.location?.area} ({inc.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={assignment.reason}
                        onChange={(e) => {
                          const updated = [...editAssignments];
                          updated[index].reason = e.target.value;
                          setEditAssignments(updated);
                        }}
                        placeholder="Reason for manual assignment"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-[11px] text-black focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>
                );
              })}

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Dispatcher Note (Optional):
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="e.g. Manually shifted Koramangala Ambulance to critical triage"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs font-bold pt-2 border-t border-neutral-100">
              <button
                onClick={() => setEditModal(false)}
                className="px-4 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2.5 rounded-full bg-black text-white hover:bg-neutral-800 shadow"
              >
                Save Overrides &amp; Generate New Version
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        resources={resources}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
