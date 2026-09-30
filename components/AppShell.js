// The frame around every page: top bar with page links, co-pilot alerts, help, who is signed in.
// Phones get the page links as a bottom bar.
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/components/api";
import CopilotBell from "@/components/CopilotBell";

const PAGES = [
  ["/", "🚨", "Control room"],
  ["/fleet", "🚑", "Fleet"],
  ["/history", "🕒", "History"],
];

const STEPS = [
  ["📞", "A call comes in", "Press New emergency. Speak or paste what the caller says and the AI fills in the form, or fill it in yourself."],
  ["✨", "The AI makes a plan", "Four AI assistants check how serious it is, find the nearest free units, decide who goes where, and explain it. You can watch every step live. Distances and times come from real calculations, not guesses."],
  ["✅", "You decide", "Read the plan. Approve & send units, or reject it. Nothing moves until you approve."],
  ["📻", "Crews report back", "Open Fleet and press Arrived, Broke down or Job done when a crew radios in. If a vehicle breaks down, the AI finds a replacement and tells you what changed."],
  ["🔔", "The co-pilot watches", "The bell warns you about things that need attention: hospitals filling up, crews that have not reported, questions from the AI."],
  ["🕒", "History", "Every report, plan, decision and crew update is kept with who did it and when."],
];

export function HelpDialog({ onClose }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">How RakshaNet works</h2>
            <p className="text-sm text-slate-500">You are the dispatcher. The AI helps; you decide.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close">✕</button>
        </div>
        <ol className="space-y-4">
          {STEPS.map(([icon, title, text], index) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl">{icon}</span>
              <div>
                <p className="font-semibold text-slate-900">{index + 1}. {title}</p>
                <p className="text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <button onClick={onClose} className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700">Got it</button>
      </div>
    </div>
  );
}

export default function AppShell({ data, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const { userName, loadError, load } = data;

  const logout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="flex h-dvh flex-col bg-slate-50">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg text-white">🛡️</span>
            <span className="min-w-0">
              <span className="block font-bold leading-tight text-slate-900">RakshaNet</span>
              <span className="hidden truncate text-xs text-slate-500 sm:block">Bengaluru emergency control room</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {PAGES.map(([href, icon, label]) => (
              <Link key={href} href={href}
                className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${pathname === href ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}>
                {icon} {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <CopilotBell data={data} />
          <button onClick={() => setShowHelp(true)} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            ❔<span className="hidden sm:inline"> How it works</span>
          </button>
          {userName && (
            <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">{userName.slice(0, 1).toUpperCase()}</span>
              <span className="text-sm text-slate-700">{userName}</span>
              <button onClick={logout} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700">Sign out</button>
            </div>
          )}
        </div>
      </header>

      {loadError && (
        <div className="flex items-center justify-between gap-3 bg-red-50 px-6 py-2 text-sm text-red-700">
          <span>{loadError}</span>
          <button onClick={load} className="font-semibold underline">Try again</button>
        </div>
      )}

      <div className="min-h-0 flex-1">{children}</div>

      <nav className="grid shrink-0 grid-cols-3 border-t border-slate-200 bg-white lg:hidden">
        {PAGES.map(([href, icon, label]) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${pathname === href ? "font-semibold text-blue-700" : "text-slate-500"}`}>
            <span className="text-lg">{icon}</span>{label}
          </Link>
        ))}
      </nav>

      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
    </div>
  );
}
