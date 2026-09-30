// Shared data for every page: emergencies, units, current plan, who is signed in. Refreshes every 15 s.
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentPlan, getIncidents, getResources, whoAmI } from "@/components/api";

const REFRESH_MS = 15000;

export function useControlRoom({ paused = false } = {}) {
  const [incidents, setIncidents] = useState([]);
  const [resources, setResources] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [userName, setUserName] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const apply = useCallback(([inc, res, cur]) => {
    if (inc.ok) setIncidents(inc.data);
    if (res.ok) setResources(res.data);
    if (cur.ok) setPlan(cur.data);
    setLoadError(inc.ok && res.ok ? "" : (inc.error ?? res.error)?.message ?? "Could not load the latest data.");
    setLoaded(true);
    setRefreshKey((k) => k + 1);
  }, []);

  const load = useCallback(async () => {
    apply(await Promise.all([getIncidents(), getResources(), getCurrentPlan()]));
  }, [apply]);

  useEffect(() => {
    let ignore = false;
    whoAmI().then((res) => { if (!ignore && res.ok) setUserName(res.data.name ?? ""); });
    Promise.all([getIncidents(), getResources(), getCurrentPlan()]).then((results) => { if (!ignore) apply(results); });
    return () => { ignore = true; };
  }, [apply]);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load, paused]);

  // Put a saved unit on screen straight away (no waiting for the next refresh).
  const saveUnit = useCallback((unit) => {
    setResources((list) => (list.some((r) => r.id === unit.id) ? list.map((r) => (r.id === unit.id ? unit : r)) : [...list, unit]));
  }, []);
  const dropUnit = useCallback((id) => setResources((list) => list.filter((r) => r.id !== id)), []);

  return { incidents, resources, plan, loaded, loadError, userName, refreshKey, load, saveUnit, dropUnit };
}
