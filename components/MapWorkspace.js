// Owner: Daksh
"use client";

export default function MapWorkspace({
  incidents = [],
  resources = [],
  selectedIncident = null,
  onOpenReport = () => {},
  children,
}) {
  const ambulances = resources.filter((r) => r.kind === "ambulance");
  const fireUnits = resources.filter((r) => r.kind === "fire_unit");
  const rescueTeams = resources.filter((r) => r.kind === "rescue_team");
  const hospitals = resources.filter((r) => r.kind === "hospital");

  const totalBeds = hospitals.reduce((sum, h) => sum + (h.capacity?.total || 0), 0);
  const usedBeds = hospitals.reduce((sum, h) => sum + (h.capacity?.used || 0), 0);

  return (
    <main className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden">
      {/* Top Map Action Strip */}
      <div className="h-10 bg-slate-900/80 border-b border-slate-800/80 px-4 flex items-center justify-between z-10 shrink-0 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-bold">GRID BENGALURU-URBAN</span>
            <span className="text-slate-500 hidden md:inline">
              [12.9716° N, 77.5946° E]
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Quick Resource Pills */}
          <div className="hidden sm:flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">AMB:</span>
            <span className="text-white font-bold">{ambulances.length}</span>
            <span className="text-slate-400">FIRE:</span>
            <span className="text-white font-bold">{fireUnits.length}</span>
            <span className="text-slate-400">RESCUE:</span>
            <span className="text-white font-bold">{rescueTeams.length}</span>
          </div>
        </div>

        {/* Hospital Capacity Gauge */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-slate-400 hidden lg:inline">CITY BEDS:</span>
          <span className="text-slate-200 font-bold">
            {totalBeds - usedBeds} / {totalBeds} Free
          </span>
          <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden hidden md:block">
            <div
              className="h-full bg-indigo-500 rounded-full"
              style={{
                width: `${totalBeds ? (usedBeds / totalBeds) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Map Viewport Area */}
      <div className="flex-1 relative w-full h-full bg-[#080d19]">
        {children ? (
          children
        ) : (
          /* Tactical Map Placeholder before Step 1.3 Leaflet integration */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
            {/* Background Tactical Grid Pattern */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#38bdf8 1px, #080d19 1px)",
                backgroundSize: "40px 40px",
                backgroundPosition: "0 0, 20px 20px",
              }}
            />

            {/* Radar Pulse Effect */}
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full border border-sky-500/30 flex items-center justify-center animate-ping absolute inset-0 opacity-30"></div>
              <div className="w-32 h-32 rounded-full border border-sky-500/40 bg-sky-950/20 flex items-center justify-center relative">
                <div className="w-20 h-20 rounded-full border border-red-500/40 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                </div>
              </div>
            </div>

            <h3 className="text-base font-mono font-bold text-white tracking-wider mb-2">
              TACTICAL MAP VIEWPORT
            </h3>
            <p className="text-xs text-slate-400 max-w-md mb-4 font-sans">
              Preparing live OpenStreetMap feed for Bengaluru city. Resource markers,
              incident hot-spots, and AI routing vectors will render here in Step 1.3.
            </p>

            <button
              onClick={onOpenReport}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-semibold tracking-wide transition-all shadow-lg shadow-red-950/50 flex items-center gap-2"
            >
              <span>+ Click to Report New Incident</span>
            </button>
          </div>
        )}

        {/* Selected Incident Floating Banner (if one is selected) */}
        {selectedIncident && (
          <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl p-3.5 shadow-2xl z-20 font-mono text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white">
                {selectedIncident.code} ({selectedIncident.type?.toUpperCase()})
              </span>
              <span className="text-[10px] text-slate-400">
                {selectedIncident.location?.area}
              </span>
            </div>
            <p className="text-slate-300 font-sans text-xs mb-2 line-clamp-2">
              {selectedIncident.description}
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-1.5">
              <span>Status: {selectedIncident.status}</span>
              <span>
                Coordinates: {selectedIncident.location?.lat},{" "}
                {selectedIncident.location?.lng}
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
