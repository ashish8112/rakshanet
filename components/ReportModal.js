// Owner: Daksh
"use client";

import { useState } from "react";
import { createIncident } from "@/components/api";

const EMERGENCY_TYPES = [
  { id: "collapse", label: "Building Collapse", icon: "🏚️", defaultSev: 5 },
  { id: "flood", label: "Flood / Submersion", icon: "🌊", defaultSev: 4 },
  { id: "fire", label: "Structure Fire", icon: "🔥", defaultSev: 4 },
  { id: "accident", label: "Traffic Accident", icon: "🚗", defaultSev: 3 },
  { id: "medical", label: "Medical Crisis", icon: "🩺", defaultSev: 3 },
  { id: "other", label: "Other Hazard", icon: "⚠️", defaultSev: 2 },
];

function ReportForm({ onClose, initialLocation, onSuccess }) {
  const [type, setType] = useState("flood");
  const [area, setArea] = useState(initialLocation?.area || "Koramangala");
  const [lat, setLat] = useState(initialLocation?.lat ?? 12.9352);
  const [lng, setLng] = useState(initialLocation?.lng ?? 77.6245);
  const [description, setDescription] = useState("");
  const [peopleAffected, setPeopleAffected] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please describe the emergency incident.");
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
          area: area.trim() || "Bengaluru",
        },
        peopleAffected: peopleAffected ? Number(peopleAffected) : null,
      });

      if (res.ok) {
        onSuccess(res.data);
        onClose();
      } else {
        setError(res.error?.message || "Failed to create incident");
      }
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-neutral-100 overflow-hidden flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-black tracking-tight">
            Report Emergency Incident
          </h3>
          <p className="text-xs text-neutral-500 font-medium">
            Submit caller dispatch details into RakshaNet
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

        {/* Type Selector (Uber ride-option tiles) */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
            Select Incident Type
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
            Location Details
          </label>
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 space-y-2">
            <div>
              <span className="text-[11px] font-semibold text-neutral-500">
                Area / Landmark Name:
              </span>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Koramangala 4th Block"
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-medium text-black focus:outline-none focus:border-black mt-1"
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

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
            Incident Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Ground floor flooded, 10 seniors marooned with rising water..."
            className="w-full h-20 bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-xs text-black focus:outline-none focus:border-black"
            required
          />
        </div>

        {/* People Affected */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
            Estimated People Affected / Trapped
          </label>
          <input
            type="number"
            min="0"
            value={peopleAffected}
            onChange={(e) => setPeopleAffected(e.target.value)}
            placeholder="e.g. 10 (optional if unknown)"
            className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-2 text-xs font-medium text-black focus:outline-none focus:border-black"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-full bg-black hover:bg-neutral-800 active:scale-95 text-white font-bold text-xs tracking-tight shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span>Submitting Request...</span>
            ) : (
              <>
                <span>🚨</span>
                <span>Submit Emergency Dispatch Request</span>
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
  onSuccess = () => {},
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
      <ReportForm
        key={initialLocation ? `${initialLocation.lat}-${initialLocation.lng}` : "new"}
        onClose={onClose}
        initialLocation={initialLocation}
        onSuccess={onSuccess}
      />
    </div>
  );
}
