// The city map: emergencies, units, hospitals and shelters. Loaded only in the browser (Leaflet needs `window`).
"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { severityInfo, typeIcon, typeLabel, unitIcon, unitLabel, unitStatusInfo, incidentStatusInfo, isMobileUnit } from "@/components/labels";

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
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 13), { duration: 0.8 });
  }, [target, map]);
  return null;
}

export default function MapView({ incidents, resources, selectedId, onSelectIncident, picking, pickedLocation, onPick }) {
  const byId = new Map(resources.map((r) => [r.id, r]));
  const selected = incidents.find((i) => i.id === selectedId);

  // Dashed line from every unit on its way / at the scene to its emergency.
  const routes = incidents.flatMap((incident) =>
    (incident.assignedResources ?? [])
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((unit) => ({ key: `${unit.id}-${incident.id}`, from: unit.location, to: incident.location }))
  );

  return (
    <MapContainer center={BENGALURU} zoom={12} zoomControl={false} className={`h-full w-full ${picking ? "cursor-crosshair" : ""}`}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />
      {picking && <ClickToPick onPick={onPick} />}
      <FlyTo target={pickedLocation ?? (selected ? selected.location : null)} />

      {routes.map((route) => (
        <Polyline key={route.key} positions={[[route.from.lat, route.from.lng], [route.to.lat, route.to.lng]]}
          pathOptions={{ color: "#2563eb", weight: 3, opacity: 0.7, dashArray: "6 8" }} />
      ))}

      {resources.map((unit) => (
        <Marker key={unit.id} position={[unit.location.lat, unit.location.lng]} icon={unitMarker(unit)}>
          <Popup>
            <div className="min-w-40 space-y-0.5">
              <div className="font-semibold text-slate-900">{unitIcon(unit.kind)} {unit.code}</div>
              <div className="text-slate-600">{unitLabel(unit.kind)} · {unit.location.area}</div>
              {unit.capacity ? (
                <div className="text-slate-600">{unit.capacity.total - unit.capacity.used} free places of {unit.capacity.total}</div>
              ) : (
                <div className="text-slate-600">{unitStatusInfo(unit.status).label}</div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

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
  );
}
