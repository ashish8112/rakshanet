// Owner: Daksh
"use client";

import { useState, useMemo } from "react";
import { createIncident } from "@/components/api";
import { getNearestResponders } from "@/components/geo";

const EMERGENCY_TYPES = [
  { id: "medical", label: "Medical Crisis", icon: "🚑", kind: "ambulance" },
  { id: "flood", label: "Flood / Submersion", icon: "🌊", kind: "rescue_team" },
  { id: "fire", label: "Structure Fire", icon: "🔥", kind: "fire_unit" },
  { id: "collapse", label: "Building Collapse", icon: "🏚️", kind: "rescue_team" },
  { id: "accident", label: "Traffic Accident", icon: "🚗", kind: "ambulance" },
  { id: "other", label: "Other Hazard", icon: "⚠️", kind: "ambulance" },
];

function ReportForm({ onClose, initialLocation, resources = [], onSuccess }) {
  const [type, setType] = useState("medical");
  const [area, setArea] = useState(initialLocation?.area || "Koramangala");
  const [lat, setLat] = useState(initialLocation?.lat ?? 12.9352);
  const [lng, setLng] = useState(initialLocation?.lng ?? 77.6245);
  const [description, setDescription] = useState("");
  const [peopleAffected, setPeopleAffected] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedData, setSubmittedData] = useState(null);

  // Compute live nearest responders and ETA for this exact map location
  const nearestList = useMemo(() => {
    return getNearestResponders({ lat: Number(lat), lng: Number(lng) }, resources);
  }, [lat, lng, resources]);

  // Find nearest responder matching the selected emergency type
  const targetKind = EMERGENCY_TYPES.find((t) => t.id === type)?.kind || "ambulance";
  const defaultResponder = useMemo(
    () => ({
      resource: {
        name:
          targetKind === "fire_unit"
            ? "Central Fire Engine 01"
            : targetKind === "rescue_team"
            ? "Disaster Rescue Team 01"
            : "City Emergency Ambulance 01",
        kind: targetKind,
      },
      distanceKm: 2.1,
      etaMinutes: 4,
    }),
    [targetKind]
  );

  const primaryResponder = useMemo(() => {
    return (
      nearestList.find((item) => item.resource.kind === targetKind) ||
      nearestList[0] ||
      defaultResponder
    );
  }, [nearestList, targetKind, defaultResponder]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please describe the emergency incident so responders are prepared.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const res = await createIncident({
        type,
        description,
        location: {
          lat: Number(lat),
          lng: Number(lng),
          area: area.trim() || "Bengaluru Location",
        },
        peopleAffected: peopleAffected ? Number(peopleAffected) : null,
      });

      if (res.ok) {
        setSubmittedData({
          incident: res.data,
          etaMinutes: primaryResponder?.etaMinutes || 6,
          distanceKm: primaryResponder?.distanceKm || 2.5,
          unitName: primaryResponder?.resource.name || "Emergency Rapid Response Unit",
        });
        if (onSuccess) onSuccess(res.data);
      } else {
        setError(res.error?.message || "Failed to create incident");
      }
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // If submitted successfully, show clear ETA confirmation card
  if (submittedData) {
    return (
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-neutral-100 p-6 text-center select-none font-sans">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl mx-auto mb-4 border border-emerald-200">
          ✓
        </div>

        <h3 className="text-xl font-extrabold text-black tracking-tight mb-1">
          Rescue Service Dispatched!
        </h3>
        <p className="text-xs text-neutral-500 mb-5">
          Emergency call logged with code: <strong>{submittedData.incident.code || "INC-NEW"}</strong>
        </p>

        {/* Big ETA Callout (Uber style) */}
        <div className="bg-neutral-900 text-white rounded-2xl p-5 mb-5 text-center shadow-lg">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            Estimated Arrival Time
          </span>
          <div className="text-4xl font-black tracking-tight my-1">
            ~{submittedData.etaMinutes} MINS
          </div>
          <p className="text-xs text-neutral-300">
            {submittedData.unitName} is en route ({submittedData.distanceKm} km away)
          </p>
        </div>

        <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-100 text-left text-xs space-y-1.5 mb-5 text-neutral-700">
          <div className="flex justify-between">
            <span className="text-neutral-500">Target Area:</span>
            <span className="font-bold text-black">{area}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Emergency Type:</span>
            <span className="font-bold text-black capitalize">{type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Live Status:</span>
            <span className="font-bold text-emerald-600">Dispatched • En Route</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-lg transition"
        >
          Track on Live Map
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-neutral-100 overflow-hidden flex flex-col max-h-[92vh]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
            <h3 className="text-lg font-extrabold text-black tracking-tight">
              Request Emergency Rescue
            </h3>
          </div>
          <p className="text-xs text-neutral-500 font-medium">
            Select emergency service and confirm dispatch to your location
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold text-xs"
        >
          ✕
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
        {error && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-[#e11900]">
            {error}
          </div>
        )}

        {/* Live ETA Banner for Selected Location */}
        {primaryResponder && (
          <div className="bg-neutral-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Nearest Responder Available
              </span>
              <div className="text-xs font-bold text-white">
                {primaryResponder.resource.name}
              </div>
              <div className="text-[11px] text-neutral-400">
                {primaryResponder.distanceKm} km away from pinned location
              </div>
            </div>

            <div className="text-right shrink-0 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10">
              <div className="text-xl font-extrabold text-white">
                ~{primaryResponder.etaMinutes} min
              </div>
              <span className="text-[9px] font-bold uppercase text-neutral-300">
                Estimated ETA
              </span>
            </div>
          </div>
        )}

        {/* Service Type Selector (Uber tiles) */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
            1. Select Required Rescue Service
          </label>
          <div className="grid grid-cols-3 gap-2">
            {EMERGENCY_TYPES.map((t) => {
              const isSelected = type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                    isSelected
                      ? "bg-black text-white border-black shadow-md"
                      : "bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200/80"
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-xs font-bold leading-tight">
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Location Area & Coordinates */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
            2. Rescue Location on Map
          </label>
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5 space-y-2">
            <div>
              <span className="text-[11px] font-semibold text-neutral-500">
                Area / Street / Landmark:
              </span>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Koramangala 4th Block"
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-black focus:outline-none focus:border-black mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div>
                <span className="text-neutral-500">Latitude:</span>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs text-black focus:outline-none focus:border-black mt-0.5"
                />
              </div>
              <div>
                <span className="text-neutral-500">Longitude:</span>
                <input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs text-black focus:outline-none focus:border-black mt-0.5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Situation Description */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
            3. Situation & Details
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Elderly person unconscious, needs immediate oxygen and cardiac support..."
            className="w-full h-20 bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-xs text-black focus:outline-none focus:border-black"
            required
          />
        </div>

        {/* People Affected Count */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
            4. Estimated People Requiring Assistance
          </label>
          <input
            type="number"
            min="1"
            value={peopleAffected}
            onChange={(e) => setPeopleAffected(e.target.value)}
            placeholder="e.g. 2 (optional)"
            className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-2 text-xs font-semibold text-black focus:outline-none focus:border-black"
          />
        </div>

        {/* Error message placed directly above submit button so it is visible even when scrolled down */}
        {error && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-[#e11900] flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Confirm and Submit Dispatch Button with Live ETA */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-xs tracking-tight shadow-xl shadow-red-900/30 transition disabled:opacity-50 flex items-center justify-center gap-2 border border-red-500 cursor-pointer"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Connecting to Dispatch Engine...</span>
              </span>
            ) : (
              <>
                <span>🚨</span>
                <span>
                  Confirm & Dispatch Rescue{" "}
                  {primaryResponder ? `(~${primaryResponder.etaMinutes} min ETA)` : ""}
                </span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}

export default function ReportModal({
  isOpen = false,
  onClose = () => {},
  initialLocation = null,
  resources = [],
  onSuccess = () => {},
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
      <ReportForm
        key={initialLocation ? `${initialLocation.lat}-${initialLocation.lng}` : "new"}
        onClose={onClose}
        initialLocation={initialLocation}
        resources={resources}
        onSuccess={onSuccess}
      />
    </div>
  );
}
