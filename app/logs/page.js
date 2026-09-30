// Owner: Daksh
"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import ReportModal from "@/components/ReportModal";
import { getLogs } from "@/components/api";

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [isReportOpen, setIsReportOpen] = useState(false);

  const loadData = () => {
    getLogs().then((res) => {
      if (res.ok) setLogs(res.data || []);
    });
  };

  useEffect(() => {
    let ignore = false;
    getLogs().then((res) => {
      if (!ignore && res.ok) {
        setLogs(res.data || []);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

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

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-neutral-900 font-sans flex flex-col">
      <Navbar onOpenReport={() => setIsReportOpen(true)} onRefresh={loadData} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📜</span>
            <h1 className="text-2xl font-extrabold text-black tracking-tight">
              AI Multi-Agent Activity Timeline
            </h1>
          </div>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Transparent logs showing every decision, routing calculation, and assessment made by the AI agents
          </p>
        </div>

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
        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-neutral-200 shadow-sm">
            <span className="text-3xl mb-2 block">🤖</span>
            <h3 className="font-bold text-sm text-black">No Agent Logs Found</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Trigger an AI replanning cycle from the Dispatch screen to generate agent activity logs.
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
