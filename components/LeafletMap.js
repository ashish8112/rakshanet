// Owner: Daksh
"use client";

import { useEffect, useState, useMemo, useSyncExternalStore } from "react";
import { getNearestResponders } from "@/components/geo";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";

// Component to handle map clicks and fly-to interactions
function MapEventHandler({ onMapClick, selectedLocation, pendingLocation }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({
          lat: Number(e.latlng.lat.toFixed(5)),
          lng: Number(e.latlng.lng.toFixed(5)),
        });
      }
    },
  });

  const target = pendingLocation || selectedLocation;

  useEffect(() => {
    if (target?.lat && target?.lng) {
      map.flyTo([target.lat, target.lng], 14, {
        duration: 1.0,
      });
    }
  }, [target?.lat, target?.lng, map]);

  return null;
}


// Custom HTML Pin Generators matching Uber's aesthetic
const createIncidentIcon = (severity, type, isSelected) => {
  let color = "#e11900"; // Sev 5
  if (severity === 4) color = "#ff7000";
  if (severity === 3) color = "#f59e0b";
  if (severity === 2) color = "#276ef1";
  if (severity === 1 || !severity) color = "#64748b";

  const size = isSelected ? 42 : 34;

  return L.divIcon({
    className: "custom-incident-pin",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${size}px;
        height: ${size}px;
      ">
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: ${color};
          opacity: 0.25;
          animation: uber-pulse 2s infinite;
        "></div>
        <div style="
          width: ${size - 8}px;
          height: ${size - 8}px;
          background: #ffffff;
          border: 3px solid ${color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 11px;
          color: #000000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        ">
          ${severity || "!"}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createResourceIcon = (kind, status) => {
  let bg = "#000000";
  let border = "#05944f"; // available = green
  let symbol = "🚑";

  if (kind === "fire_unit") {
    border = "#e11900";
    symbol = "🚒";
  } else if (kind === "rescue_team") {
    border = "#ff7000";
    symbol = "🛟";
  } else if (kind === "hospital") {
    bg = "#ffffff";
    border = "#276ef1";
    symbol = "🏥";
  } else if (kind === "shelter") {
    bg = "#ffffff";
    border = "#8b5cf6";
    symbol = "⛺";
  }

  if (status === "en_route") border = "#276ef1";
  if (status === "on_scene") border = "#e11900";
  if (status === "unavailable") border = "#94a3b8";

  return L.divIcon({
    className: "custom-resource-pin",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${bg};
        border: 2.5px solid ${border};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        font-size: 14px;
      ">
        ${symbol}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const emptySubscribe = () => () => {};

export default function LeafletMap({
  incidents = [],
  resources = [],
  currentPlan = null,
  selectedIncident = null,
  pendingLocation = null,
  onSelectIncident = () => {},
  onSelectResource = () => {},
  onMapClick = () => {},
  onRequestRescue = null,
}) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const nearestToPending = useMemo(() => {
    if (!pendingLocation?.lat || !pendingLocation?.lng) return null;
    const list = getNearestResponders(pendingLocation, resources);
    return list[0] || null;
  }, [pendingLocation, resources]);

  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#f6f6f6] font-sans text-neutral-500">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
          <span className="text-xs font-semibold tracking-wider">Loading Bengaluru Map...</span>
        </div>
      </div>
    );
  }

  // Build route lines from current plan assignments
  const resourceMap = new Map(resources.map((r) => [r.id, r]));
  const incidentMap = new Map(incidents.map((i) => [i.id, i]));

  const routeLines = (currentPlan?.assignments || [])
    .map((a) => {
      const res = resourceMap.get(a.resourceId);
      const inc = incidentMap.get(a.incidentId);
      if (res?.location && inc?.location) {
        return {
          id: `${a.resourceId}-${a.incidentId}`,
          positions: [
            [res.location.lat, res.location.lng],
            [inc.location.lat, inc.location.lng],
          ],
          eta: a.etaMinutes,
          km: a.distanceKm,
          resName: res.name,
          incCode: inc.code,
        };
      }
      return null;
    })
    .filter(Boolean);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[12.9716, 77.5946]}
        zoom={12}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full"
      >
        {/* OpenStreetMap Tiles (100% Free, No API Key Required) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapEventHandler
          onMapClick={onMapClick}
          selectedLocation={selectedIncident?.location}
          pendingLocation={pendingLocation}
        />


        {/* Dynamic Assignment Route Vectors */}
        {routeLines.map((line) => (
          <Polyline
            key={line.id}
            positions={line.positions}
            pathOptions={{
              color: "#000000",
              weight: 3.5,
              dashArray: "6, 8",
              opacity: 0.85,
            }}
          >
            <Popup>
              <div className="p-2 text-xs font-sans">
                <div className="font-bold text-black mb-0.5">
                  Route Vector: {line.resName}
                </div>
                <div className="text-neutral-600">
                  En route to {line.incCode} • <strong>{line.eta} min ETA</strong> ({line.km} km)
                </div>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Live Vector Line to Selected Rescue Target */}
        {pendingLocation && nearestToPending?.resource?.location && (
          <Polyline
            positions={[
              [nearestToPending.resource.location.lat, nearestToPending.resource.location.lng],
              [pendingLocation.lat, pendingLocation.lng],
            ]}
            pathOptions={{
              color: "#e11900",
              weight: 4,
              dashArray: "4, 6",
              opacity: 0.9,
            }}
          />
        )}

        {/* Selected Rescue Location Pin */}
        {pendingLocation?.lat && pendingLocation?.lng && (
          <Marker
            position={[pendingLocation.lat, pendingLocation.lng]}
            icon={L.divIcon({
              className: "custom-pending-pin",
              html: `
                <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
                  <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: #e11900; opacity: 0.35; animation: uber-pulse 1.5s infinite;"></div>
                  <div style="width: 36px; height: 36px; background: #000000; border: 3px solid #e11900; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 14px rgba(0,0,0,0.35);">
                    📍
                  </div>
                </div>
              `,
              iconSize: [44, 44],
              iconAnchor: [22, 22],
            })}
          >
            <Popup autoPan={false}>
              <div className="p-2 text-xs font-sans">
                <div className="font-extrabold text-black mb-1">
                  🚨 Rescue Target Location
                </div>
                {nearestToPending ? (
                  <div className="text-neutral-700">
                    Nearest Unit: <strong>{nearestToPending.resource.name}</strong><br />
                    ETA: <strong className="text-red-600">~{nearestToPending.etaMinutes} mins</strong> ({nearestToPending.distanceKm} km)
                    {onRequestRescue && (
                      <button
                        onClick={() => onRequestRescue(pendingLocation)}
                        className="mt-2 w-full py-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-[11px] shadow transition flex items-center justify-center gap-1.5"
                      >
                        <span>🚨</span>
                        <span>Request Rescue Here (~{nearestToPending.etaMinutes} min)</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-neutral-500">Calculating nearest responder...</div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Resources Markers */}
        {resources.map((res) => {
          if (!res.location?.lat || !res.location?.lng) return null;
          return (
            <Marker
              key={res.id}
              position={[res.location.lat, res.location.lng]}
              icon={createResourceIcon(res.kind, res.status)}
              eventHandlers={{
                click: () => onSelectResource(res),
              }}
            >
              <Popup>
                <div className="p-2 text-xs font-sans max-w-[220px]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm text-black">{res.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-neutral-100 text-black">
                      {res.kind.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-neutral-500 text-[11px] mb-1.5">
                    {res.location.area}
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        res.status === "available"
                          ? "bg-emerald-500"
                          : res.status === "en_route"
                          ? "bg-blue-500"
                          : "bg-neutral-400"
                      }`}
                    />
                    <span className="font-semibold text-neutral-800 capitalize">
                      {res.status.replace("_", " ")}
                    </span>
                  </div>
                  {res.capacity && (
                    <div className="bg-neutral-100 p-1.5 rounded-lg text-[11px] text-neutral-700">
                      Capacity: <strong>{res.capacity.total - res.capacity.used} free</strong> / {res.capacity.total} total
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Incidents Markers */}
        {incidents.map((inc) => {
          if (!inc.location?.lat || !inc.location?.lng) return null;
          const isSelected = selectedIncident?.id === inc.id;

          return (
            <Marker
              key={inc.id}
              position={[inc.location.lat, inc.location.lng]}
              icon={createIncidentIcon(inc.severity, inc.type, isSelected)}
              eventHandlers={{
                click: () => onSelectIncident(inc),
              }}
            >
              <Popup>
                <div className="p-2 text-xs font-sans max-w-[240px]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm text-black">{inc.code}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white uppercase">
                      Sev {inc.severity || "?"}
                    </span>
                  </div>
                  <div className="font-semibold text-neutral-800 capitalize mb-1">
                    {inc.type} in {inc.location?.area}
                  </div>
                  <p className="text-neutral-600 text-xs mb-2 leading-relaxed">
                    {inc.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] border-t border-neutral-100 pt-1.5">
                    <span className="text-neutral-500 capitalize">
                      Status: <strong>{inc.status}</strong>
                    </span>
                    {inc.peopleAffected !== null && (
                      <span className="font-bold text-red-600">
                        {inc.peopleAffected} affected
                      </span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
