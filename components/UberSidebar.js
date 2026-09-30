// Owner: Daksh
"use client";

export default function UberSidebar({
  activeView = "map",
  onSelectView = () => {},
  incidentCount = 0,
  unitCount = 0,
}) {
  const navItems = [
    {
      id: "map",
      label: "Live Map",
      badge: null,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
      ),
    },
    {
      id: "incidents",
      label: "Incidents",
      badge: incidentCount > 0 ? incidentCount : null,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    },
    {
      id: "fleet",
      label: "Fleet Units",
      badge: unitCount > 0 ? unitCount : null,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
    },
    {
      id: "planner",
      label: "AI Planner",
      badge: "AI",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-16 md:w-20 bg-black text-white flex flex-col items-center py-4 justify-between shrink-0 select-none z-30 border-r border-neutral-900 shadow-2xl">
      {/* Brand Icon */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-10 h-10 rounded-xl bg-white text-black font-extrabold text-xl flex items-center justify-center shadow-lg tracking-tighter">
          R
        </div>
        <span className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase mt-0.5">
          EOC
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col items-center gap-4 my-auto">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
                isActive
                  ? "bg-white text-black shadow-lg"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
              title={item.label}
            >
              {item.icon}
              <span className="text-[8px] font-semibold tracking-tight mt-0.5">
                {item.label.split(" ")[0]}
              </span>

              {/* Pill Badge */}
              {item.badge && (
                <span
                  className={`absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                    item.badge === "AI"
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                      : "bg-red-600 text-white"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile / Status */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative" title="System Status: AI Orchestration Active">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute inset-0 opacity-75" />
        </div>

        <div
          className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-200"
          title="Daksh - Dispatch Controller"
        >
          DK
        </div>
      </div>
    </aside>
  );
}
