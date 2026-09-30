// The city map: emergencies, units, hospitals and shelters. Loaded only in the browser (Leaflet needs `window`).
"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { severityInfo, typeIcon, typeLabel, unitIcon, unitLabel, unitStatusInfo, unitTitle, incidentStatusInfo, isMobileUnit } from "@/components/labels";
import { arrivalText, setDemoSpeed, trip, useDemoSpeed } from "@/components/movement";

const BENGALURU = [12.9716, 77.5946];

function incidentMarker(incident, selected) {
  const { color } = severityInfo(incident.severity);
  const size = selected ? 46 : 38;
  const faded = incident.status === "resolved" ? "opacity:.45;" : "";
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="${faded}width:${size}px;height:${size}px;border-radius:9999px;background:#fff;border:3px solid ${color};
      display:flex;align-items:center;justify-content:center;font-size:${selected ? 22 : 18}px;
      box-shadow:0 4px 14px rgba(15,23,42,.18)${selected ? `,0 0 0 6px ${color}33` : ""}">${typeIcon(incident.type)}</div>`,
  });
}

function unitMarker(unit) {
  const mobile = isMobileUnit(unit.kind);
  const busy = unit.status !== "available";
  const out = unit.status === "unavailable";
  const size = mobile ? 30 : 26;
  const ring = out ? "#cbd5e1" : busy ? "#2563eb" : "#10b981";
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:10px;background:#fff;border:2px solid ${ring};
      display:flex;align-items:center;justify-content:center;font-size:${mobile ? 15 : 13}px;${out ? "opacity:.5;filter:grayscale(1);" : ""}
      box-shadow:0 2px 8px rgba(15,23,42,.12)">${unitIcon(unit.kind)}</div>`,
  });
}

const pickMarker = L.divIcon({
  className: "",
  iconSize: [34, 44],
  iconAnchor: [17, 42],
  html: `<div style="font-size:34px;line-height:1;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25))">📍</div>`,
});

function ClickToPick({ onPick }) {
  useMapEvents({ click: (e) => onPick?.({ lat: Number(e.latlng.lat.toFixed(5)), lng: Number(e.latlng.lng.toFixed(5)) }) });
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  const lat = target?.lat;
  const lng = target?.lng;
  // Depends on the numbers, not the object, so the 15-second refresh does not pull the map back.
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return; // map not visible yet: flying would fail
    try {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
    } catch {
      map.setView([lat, lng], 14);
    }
  }, [lat, lng, map]);
  return null;
}

export default function MapView({ incidents, resources, selectedId, onSelectIncident, picking, pickedLocation, onPick }) {
  const byId = new Map(resources.map((r) => [r.id, r]));
  const incidentsById = new Map(incidents.map((i) => [i.id, i]));
  const selected = incidents.find((i) => i.id === selectedId);
  const speed = useDemoSpeed();
  const [now, setNow] = useState(() => Date.now());
  const moving = resources.some((r) => ["reserved", "en_route"].includes(r.status));

  // Move the vehicles every second while any are on the road.
  useEffect(() => {
    if (!moving) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [moving]);

  const trips = new Map(resources.map((unit) => [unit.id, trip(unit, incidentsById.get(unit.assignedIncident), now, speed)]));

  // Route of every vehicle on a job: covered part faint, the rest dashed.
  const routes = incidents.flatMap((incident) =>
    (incident.assignedResources ?? [])
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((unit) => ({ key: `${unit.id}-${incident.id}`, from: unit.location, at: trips.get(unit.id)?.position ?? unit.location, to: incident.location }))
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer center={BENGALURU} zoom={12} zoomControl={false} className={`h-full w-full ${picking ? "cursor-crosshair" : ""}`}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        {picking && <ClickToPick onPick={onPick} />}
        <FlyTo target={pickedLocation ?? (selected ? selected.location : null)} />

        {routes.map((route) => (
          <Polyline key={`${route.key}-done`} positions={[[route.from.lat, route.from.lng], [route.at.lat, route.at.lng]]}
            pathOptions={{ color: "#94a3b8", weight: 3, opacity: 0.5 }} />
        ))}
        {routes.map((route) => (
          <Polyline key={route.key} positions={[[route.at.lat, route.at.lng], [route.to.lat, route.to.lng]]}
            pathOptions={{ color: "#2563eb", weight: 3, opacity: 0.8, dashArray: "6 8" }} />
        ))}

        {resources.map((unit) => {
          const t = trips.get(unit.id);
          const at = t?.position ?? unit.location;
          const job = incidentsById.get(unit.assignedIncident);
          return (
            <Marker key={unit.id} position={[at.lat, at.lng]} icon={unitMarker(unit)} zIndexOffset={t ? 500 : 0}>
              <Popup>
                <div className="min-w-44 space-y-0.5">
                  <div className="font-mono font-semibold text-slate-900">{unitIcon(unit.kind)} {unitTitle(unit)}</div>
                  <div className="text-slate-600">{unitLabel(unit.kind)} · {unit.code} · {unit.location.area} base</div>
                  {unit.capacity ? (
                    <div className="text-slate-600">{unit.capacity.total - unit.capacity.used} free places of {unit.capacity.total}</div>
                  ) : (
                    <div className="text-slate-600">{unitStatusInfo(unit.status).label}{job ? ` → ${typeLabel(job.type).toLowerCase()} in ${job.location.area}, ${arrivalText(t)}` : ""}</div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {incidents.map((incident) => (
          <Marker key={incident.id} position={[incident.location.lat, incident.location.lng]}
            icon={incidentMarker(incident, incident.id === selectedId)} zIndexOffset={1000}
            eventHandlers={{ click: () => onSelectIncident?.(incident.id) }}>
            <Popup>
              <div className="min-w-44 space-y-0.5">
                <div className="font-semibold text-slate-900">{typeLabel(incident.type)} · {incident.location.area}</div>
                <div className="text-slate-600">{severityInfo(incident.severity).label} · {incidentStatusInfo(incident.status).label}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {pickedLocation && <Marker position={[pickedLocation.lat, pickedLocation.lng]} icon={pickMarker} />}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] hidden space-y-2 lg:block">
        <div className="rounded-2xl bg-white/95 px-4 py-3 text-xs text-slate-600 shadow-lg ring-1 ring-slate-200">
          <p className="mb-1.5 font-semibold text-slate-800">On the map</p>
          <p>🔥🌊🚗 Emergencies (ring colour = how serious)</p>
          <p>🚑🚒🦺 Vehicles · <span className="text-emerald-600">green</span> free, <span className="text-blue-600">blue</span> busy</p>
          <p>🏥🏠 Hospitals and shelters · dashed line = still to drive</p>
        </div>
      </div>
      <button onClick={() => setDemoSpeed(speed === 1)}
        className={`absolute right-4 top-4 z-[1000] rounded-full px-3.5 py-1.5 text-xs font-medium shadow-md ring-1 transition ${speed > 1 ? "bg-[#0f172a] text-white ring-[#0f172a]" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
        title="Simulated movement: make time pass 10x faster for demos">
        ⏩ Demo speed {speed > 1 ? "on (10×)" : "off"}
      </button>
    </div>
  );
}
