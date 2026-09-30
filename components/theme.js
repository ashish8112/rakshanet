// Light / dark theme. Follows the device setting until the dispatcher chooses, then remembers the choice.
"use client";

import { useSyncExternalStore } from "react";

const KEY = "rn-theme";
const listeners = new Set();

const isDark = () => document.documentElement.classList.contains("dark");

export function setTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    // private window: the choice lasts until the page is closed
  }
  listeners.forEach((l) => l());
}

export function useTheme() {
  return useSyncExternalStore(
    (onChange) => { listeners.add(onChange); return () => listeners.delete(onChange); },
    () => (isDark() ? "dark" : "light"),
    () => "light"
  );
}

export function ThemeButton({ className = "" }) {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button onClick={() => setTheme(next)} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}
      className={`rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 ${className}`}>
      {theme === "dark" ? "☀️" : "🌙"}<span className="hidden xl:inline"> {theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
