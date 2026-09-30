// AI or Manual mode for planning, remembered in this browser.
"use client";

import { useSyncExternalStore } from "react";

const KEY = "rn-mode";
const listeners = new Set();

function read() {
  try {
    return window.localStorage.getItem(KEY) === "manual" ? "manual" : "ai";
  } catch {
    return "ai";
  }
}

export function setMode(mode) {
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    // private window: the choice lasts until the page is closed
  }
  listeners.forEach((l) => l());
}

export function useMode() {
  return useSyncExternalStore(
    (onChange) => { listeners.add(onChange); return () => listeners.delete(onChange); },
    read,
    () => "ai"
  );
}
