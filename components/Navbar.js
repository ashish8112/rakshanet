// Owner: Daksh
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
export default function Navbar({ onOpenReport = () => {}, onRefresh = () => {} }) {
  const pathname = usePathname();
  const [time, setTime] = useState("");

  const navLinks = [
    { href: "/", label: "Live Map", icon: "🗺️" },
    { href: "/incidents", label: "Incidents Queue", icon: "🚨" },
    { href: "/fleet", label: "Fleet & Resources", icon: "🚑" },
    { href: "/dispatch", label: "AI Dispatch Plan", icon: "⚡" },
    { href: "/logs", label: "Agent Logs", icon: "📜" },
  ];

  return (
    <header className="h-16 bg-black text-white px-4 md:px-6 flex items-center justify-between z-30 shrink-0 border-b border-neutral-800 shadow-xl select-none">
      {/* Left: Brand Logo */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-white text-black font-extrabold text-xl flex items-center justify-center shadow-lg tracking-tighter group-hover:scale-105 transition">
            R
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                RAKSHA<span className="text-red-500">NET</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-neutral-400 font-medium leading-none">
              Bengaluru Emergency Operations
            </p>
          </div>
        </Link>

        {/* Center: Clean Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-neutral-900/90 p-1 rounded-full border border-neutral-800 text-xs font-semibold">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${
                  isActive
                    ? "bg-white text-black shadow-md font-bold"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{time || "18:40 PM"} IST</span>
        </div>


        {/* Big Black Action Pill */}
        <button
          onClick={onOpenReport}
          className="flex items-center gap-2 px-4 md:px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold tracking-tight shadow-xl shadow-red-950/40 transition border border-red-500/40"
        >
          <span>🚨</span>
          <span>Request Rescue</span>
        </button>
      </div>
    </header>
  );
}
