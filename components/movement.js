// Simulated vehicle movement (there is no real GPS yet): a sent vehicle drives from its base to the emergency
// in the ETA calculated by the tools. "Demo speed" makes time pass 10x faster for presentations.
"use client";

import { useSyncExternalStore } from "react";
import { etaMinutes } from "@/components/geo";

const KEY = "rn-demo-speed";
const listeners = new Set();

function readSpeed() {
  try {
    return window.localStorage.getItem(KEY) === "10" ? 10 : 1;
  } catch {
    return 1;
  }
}

export function setDemoSpeed(fast) {
  try {
    window.localStorage.setItem(KEY, fast ? "10" : "1");
  } catch {
    // private window: keep working at normal speed
  }
  listeners.forEach((l) => l());
}

export function useDemoSpeed() {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      window.addEventListener("storage", onChange);
      return () => { listeners.delete(onChange); window.removeEventListener("storage", onChange); };
    },
    readSpeed,
    () => 1
  );
}

// Where a vehicle is right now and how long until it arrives.
// Returns null for vehicles that are not on a job.
export function trip(unit, incident, now, speed) {
  if (!incident || !["reserved", "en_route", "on_scene"].includes(unit.status)) return null;
  if (unit.status === "on_scene") return { position: incident.location, progress: 1, minutesLeft: 0, arrived: true };
  const total = Math.max(1, etaMinutes(unit.location, incident.location, unit.kind));
  const elapsed = ((now - new Date(unit.updatedAt).getTime()) / 60000) * speed;
  const progress = Math.min(1, Math.max(0, elapsed / total));
  const position = {
    lat: unit.location.lat + (incident.location.lat - unit.location.lat) * progress,
    lng: unit.location.lng + (incident.location.lng - unit.location.lng) * progress,
  };
  return { position, progress, minutesLeft: Math.max(0, Math.ceil(total - elapsed)), arrived: false, reachedButNotConfirmed: progress >= 1 };
}

export function arrivalText(t) {
  if (!t) return "";
  if (t.arrived) return "at the scene";
  if (t.reachedButNotConfirmed) return "should be there: confirm Arrived";
  return t.minutesLeft <= 1 ? "arriving now" : `arriving in ${t.minutesLeft} min`;
}
