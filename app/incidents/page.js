// Owner: Daksh
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ReportModal from "@/components/ReportModal";
import { getIncidents, updateIncident, generatePlan } from "@/components/api";
import { SEVERITY_BADGES, STATUS_PILLS } from "@/components/IncidentQueue";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [answers, setAnswers] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const loadData = () => {
    getIncidents().then((res) => {
      if (res.ok) setIncidents(res.data || []);
    });
  };

  useEffect(() => {
    let ignore = false;
    getIncidents().then((res) => {
      if (!ignore && res.ok) {
        setIncidents(res.data || []);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  const handleAnswerQuestion = async (incident) => {
    const answer = answers[incident.id];
    if (!answer || !answer.trim() || submittingId) return;

    setSubmittingId(incident.id);
    setActionNotice(null);

    const updatedDescription = `${incident.description} | Caller clarification: ${answer.trim()}`;
    const updateRes = await updateIncident(incident.id, {
      description: updatedDescription,
    });

    if (updateRes.ok) {
      setActionNotice(`Clarification saved for ${incident.code}. Re-evaluating plan with Gemini agents...`);
      await generatePlan({ trigger: "manual", incidentId: incident.id });
      setActionNotice(`✓ Plan re-evaluated for ${incident.code}. Ready in Dispatch center.`);
      setAnswers((prev) => ({ ...prev, [incident.id]: "" }));
      loadData();
    }
    setSubmittingId(null);
  };

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (filter === "critical" && inc.severity !== 5 && inc.severity !== 4) {
        return false;
      }
      if (filter === "active" && inc.status === "resolved") {
        return false;
      }
      if (filter === "dispatched" && inc.status !== "dispatched") {
        return false;
      }
      if (filter === "needs_info" && inc.status !== "needs_info") {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          inc.code?.toLowerCase().includes(q) ||
          inc.type?.toLowerCase().includes(q) ||
          inc.location?.area?.toLowerCase().includes(q) ||
          inc.description?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [incidents, filter, search]);

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-neutral-900 font-sans flex flex-col">
      <Navbar onOpenReport={() => setIsReportOpen(true)} onRefresh={loadData} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚨</span>
              <h1 className="text-2xl font-extrabold text-black tracking-tight">
                Emergency Incidents Queue
              </h1>
            </div>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Live feed of reported calls, triage assessments, and dispatcher follow-ups
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white rounded-full px-4 py-2 border border-neutral-200 shadow-sm flex items-center gap-2 w-full md:w-72">
              <span className="text-neutral-400 text-xs">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, area, or description..."
                className="w-full text-xs font-semibold text-black placeholder:text-neutral-400 bg-transparent focus:outline-none"
              />
            </div>

            <button
              onClick={() => setIsReportOpen(true)}
              className="px-4 py-2 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-bold shadow-md shrink-0"
            >
              + Report Call
            </button>
          </div>
        </div>

        {/* Action Notice Banner */}
        {actionNotice && (
          <div className="bg-neutral-900 text-white p-4 rounded-3xl mb-6 text-xs flex items-center justify-between shadow-lg border border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="text-base animate-pulse">⚡</span>
              <span>{actionNotice}</span>
            </div>
            <Link
              href="/dispatch"
              className="px-3 py-1 rounded-full bg-white text-black font-bold text-[11px] shrink-0"
            >
              Go to Dispatch →
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
            All Incidents ({incidents.length})
          </button>
          <button
            onClick={() => setFilter("critical")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              filter === "critical"
                ? "bg-[#e11900] text-white shadow-sm"
                : "bg-white text-neutral-600 hover:text-black border border-neutral-200"
            }`}
          >
            Critical (Sev 4 & 5)
          </button>
          <button
            onClick={() => setFilter("dispatched")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              filter === "dispatched"
                ? "bg-black text-white shadow-sm"
                : "bg-white text-neutral-600 hover:text-black border border-neutral-200"
            }`}
          >
            Dispatched
          </button>
          <button
            onClick={() => setFilter("needs_info")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              filter === "needs_info"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-neutral-600 hover:text-black border border-neutral-200"
            }`}
          >
            Needs Info
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              filter === "active"
                ? "bg-black text-white shadow-sm"
                : "bg-white text-neutral-600 hover:text-black border border-neutral-200"
            }`}
          >
            Active
          </button>
        </div>

        {/* Incidents Grid */}
        {filteredIncidents.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-neutral-200 shadow-sm">
            <span className="text-3xl mb-2 block">📋</span>
            <h3 className="font-bold text-sm text-black">No Incidents Found</h3>
            <p className="text-xs text-neutral-500 mt-1">
              No reported emergency incidents match the selected filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIncidents.map((inc) => {
              const sev = inc.severity ? SEVERITY_BADGES[inc.severity] : null;
              const statusClass =
                STATUS_PILLS[inc.status] ||
                "bg-neutral-100 text-neutral-600 border-neutral-200";

              const hasQuestion = inc.status === "needs_info" && inc.followUpQuestions?.length > 0;
              const isSubmittingThis = submittingId === inc.id;

              return (
                <div
                  key={inc.id}
                  className="bg-white rounded-3xl p-5 border border-neutral-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Code & Severity */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-black tracking-tight">
                          {inc.code}
                        </span>
                        <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">
                          {inc.type}
                        </span>
                        {inc.possibleDuplicateOf && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <span>⚠️</span>
                            <span>Duplicate</span>
                          </span>
                        )}
                      </div>

                      {sev ? (
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${sev.bg} ${sev.text}`}
                        >
                          {sev.label}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700">
                          ASSESSING
                        </span>
                      )}
                    </div>

                    {/* Location Pin */}
                    <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-black shrink-0" />
                      <span>{inc.location?.area || "Bengaluru Location"}</span>
                      <span className="text-neutral-400 font-mono text-[10px]">
                        [{inc.location?.lat}, {inc.location?.lng}]
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-neutral-600 leading-relaxed mb-4 pl-4.5">
                      {inc.description}
                    </p>

                    {/* Follow-up question form if needs_info (CONTRACT.md & Ashish requirement) */}
                    {hasQuestion && (
                      <div className="mb-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-950 space-y-2">
                        <span className="font-bold block">
                          ❓ AI Follow-up Question:
                        </span>
                        <p className="text-amber-900 italic text-[11px]">
                          &quot;{inc.followUpQuestions[0]}&quot;
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={answers[inc.id] || ""}
                            onChange={(e) =>
                              setAnswers({ ...answers, [inc.id]: e.target.value })
                            }
                            placeholder="Type caller clarification..."
                            className="flex-1 bg-white border border-amber-200 rounded-xl px-2.5 py-1.5 text-xs text-black focus:outline-none focus:border-amber-400"
                          />
                          <button
                            onClick={() => handleAnswerQuestion(inc)}
                            disabled={!answers[inc.id]?.trim() || isSubmittingThis}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs disabled:opacity-40 transition"
                          >
                            {isSubmittingThis ? "Saving..." : "Submit & Replan"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold uppercase border text-[10px] ${statusClass}`}
                      >
                        {inc.status?.replace("_", " ")}
                      </span>
                      {inc.peopleAffected !== null && (
                        <span className="font-bold text-[#e11900] text-[11px]">
                          {inc.peopleAffected} affected
                        </span>
                      )}
                    </div>

                    <Link
                      href="/"
                      className="text-xs font-bold text-black hover:text-red-600 flex items-center gap-1 transition"
                    >
                      <span>View on Map</span>
                      <span>➔</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
