// Top bar: name of the room, three numbers that matter, help, who is signed in.
"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/components/api";

function Stat({ value, label, tone }) {
  const tones = { red: "text-red-600", green: "text-emerald-600", amber: "text-amber-600", slate: "text-slate-900" };
  return (
    <div className="flex items-baseline gap-1.5 rounded-xl bg-slate-50 px-3 py-1.5 ring-1 ring-inset ring-slate-200">
      <span className={`text-lg font-bold tabular-nums ${tones[tone]}`}>{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

export default function Header({ openCount, freeUnits, needsDecision, userName, onHelp }) {
  const router = useRouter();
  const logout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg text-white">🛡️</div>
        <div className="min-w-0">
          <p className="font-bold leading-tight text-slate-900">RakshaNet</p>
          <p className="hidden truncate text-xs text-slate-500 sm:block">Bengaluru emergency control room</p>
        </div>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <Stat value={openCount} label={openCount === 1 ? "open emergency" : "open emergencies"} tone={openCount ? "red" : "slate"} />
        <Stat value={freeUnits} label="units free" tone={freeUnits ? "green" : "red"} />
        {needsDecision > 0 && <Stat value={needsDecision} label="waiting for you" tone="amber" />}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button onClick={onHelp} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">❔ How it works</button>
        {userName && (
          <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              {userName.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-sm text-slate-700">{userName}</span>
            <button onClick={logout} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700">Sign out</button>
          </div>
        )}
      </div>
    </header>
  );
}

const STEPS = [
  ["📞", "A call comes in", "Press New emergency. Choose the place, what happened, and type what the caller said."],
  ["✨", "Ask the AI for a plan", "Four AI assistants check how serious it is, find the nearest free units, decide who goes where, and explain it in plain words. Distances and times come from real calculations, not guesses."],
  ["✅", "You decide", "Read the plan. Approve & send units, or reject it. Nothing moves until you approve."],
  ["📻", "Crews report back", "When a crew radios in, open Units and press Arrived, Broke down or Job done. If a unit breaks down, the AI finds a replacement and tells you what changed."],
  ["🤔", "Vague calls and shortages", "If a report is unclear, the AI asks you a question on the emergency card. If there are not enough units, it warns you who has to wait and for how long."],
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
