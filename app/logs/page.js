// Owner: Daksh
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ReportModal from "@/components/ReportModal";
import { getLogs } from "@/components/api";

function LogsContent() {
  const searchParams = useSearchParams();
  const planVersionParam = searchParams.get("planVersion");

  const [logs, setLogs] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedVersion, setSelectedVersion] = useState(
    planVersionParam ? Number(planVersionParam) : null
  );
  const [loading, setLoading] = useState(true);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const loadData = () => {
    setLoading(true);
    getLogs(selectedVersion).then((res) => {
      if (res.ok) setLogs(res.data || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    let ignore = false;
    getLogs(selectedVersion).then((res) => {
      if (!ignore) {
        if (res.ok) setLogs(res.data || []);
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, [selectedVersion]);

  const agents = [
    { id: "all", label: "All Agents" },
    { id: "orchestrator", label: "Orchestrator" },
    { id: "incident_assessment", label: "Incident Assessment" },
    { id: "route_logistics", label: "Route Logistics" },
    { id: "resource_allocation", label: "Resource Allocation" },
    { id: "command_planning", label: "Command Planning" },
  ];

  const filteredLogs = useMemo(() => {
    if (selectedAgent === "all") return logs;
    return logs.filter((l) => l.agent === selectedAgent);
  }, [logs, selectedAgent]);

  // Unique plan versions present in logs
  const availableVersions = useMemo(() => {
    const set = new Set();
    logs.forEach((l) => {
      if (l.planVersion != null) set.add(l.planVersion);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [logs]);

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-neutral-900 font-sans flex flex-col">
      <Navbar onOpenReport={() => setIsReportOpen(true)} onRefresh={loadData} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧠</span>
              <h1 className="text-2xl font-extrabold text-black tracking-tight">
                AI Multi-Agent Activity Timeline
              </h1>
            </div>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Live reasoning trace for Gemini agent assessments, route logistics, and command plans
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dispatch"
              className="px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold border border-neutral-300 shadow-sm transition flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>Back to Dispatch</span>
            </Link>
          </div>
        </div>

        {/* Plan Version Filter Pill */}
        {selectedVersion !== null ? (
          <div className="bg-neutral-900 text-white rounded-2xl p-3.5 mb-5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-xs">🎯</span>
              <span className="text-xs font-bold">
                Filtered to Plan Version {selectedVersion}
              </span>
            </div>
            <button
              onClick={() => setSelectedVersion(null)}
              className="text-xs font-bold text-neutral-300 hover:text-white px-2.5 py-1 rounded-lg bg-neutral-800 transition"
            >
              Show All Versions ✕
            </button>
          </div>
        ) : (
          availableVersions.length > 0 && (
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-xs">
              <span className="text-neutral-400 font-semibold uppercase text-[10px] shrink-0">
                Filter Version:
              </span>
              <button
                onClick={() => setSelectedVersion(null)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 ${
                  selectedVersion === null
                    ? "bg-black text-white"
                    : "bg-white text-neutral-600 border border-neutral-200"
                }`}
              >
                All
              </button>
              {availableVersions.map((v) => (
                <button
                  key={v}
                  onClick={() => setSelectedVersion(v)}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-white text-neutral-600 hover:text-black border border-neutral-200 shrink-0 transition"
                >
                  Plan v{v}
                </button>
              ))}
            </div>
          )
        )}

        {/* Agent Filter Chips */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {agents.map((a) => {
            const isActive = selectedAgent === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setSelectedAgent(a.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? "bg-black text-white shadow-sm"
                    : "bg-white text-neutral-600 hover:text-black border border-neutral-200"
                }`}
              >
                {a.label}
              </button>
            );
          })}
        </div>

        {/* Timeline Log Cards */}
        {loading ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-neutral-200 shadow-sm">
            <div className="w-8 h-8 rounded-full border-3 border-black border-t-transparent animate-spin mx-auto mb-3" />
            <span className="text-xs font-bold text-neutral-700">Loading Agent Timeline...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-neutral-200 shadow-sm">
            <span className="text-3xl mb-2 block">🤖</span>
            <h3 className="font-bold text-sm text-black">No Agent Logs Found</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Run an AI replanning cycle from the Dispatch screen to generate agent activity logs.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              let agentColor = "bg-neutral-900 text-white";
              if (log.agent === "incident_assessment") agentColor = "bg-red-600 text-white";
              if (log.agent === "route_logistics") agentColor = "bg-blue-600 text-white";
              if (log.agent === "resource_allocation") agentColor = "bg-emerald-600 text-white";
              if (log.agent === "command_planning") agentColor = "bg-purple-600 text-white";

              return (
                <div
                  key={log.id}
                  className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${agentColor}`}
                      >
                        {log.agent?.replace("_", " ")}
                      </span>
                      {log.planVersion && (
                        <span className="text-xs font-bold text-neutral-500">
                          Plan v{log.planVersion}
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-medium text-neutral-400">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-800 font-medium leading-relaxed mb-2">
                    {log.message}
                  </p>

                  {/* Output JSON inspector preview if exists */}
                  {log.output && Object.keys(log.output).length > 0 && (
                    <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-100 text-[11px] font-mono text-neutral-600 overflow-x-auto">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(log.output, null, 2)}
                      </pre>
                    </div>
                  )}
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

export default function LogsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-3 border-black border-t-transparent animate-spin" />
        </div>
      }
    >
      <LogsContent />
    </Suspense>
  );
}
