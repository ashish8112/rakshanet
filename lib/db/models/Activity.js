// Activity (collection `activities`): the control room history — who did what, when.
// Written by the API routes (see lib/activity.js); read by GET /api/activity.
import mongoose from "mongoose";
import { jsonOptions, ObjectId } from "./shared";

export const ACTIVITY_TYPES = [
  "incident_reported", "incident_updated", "incident_resolved",
  "plan_proposed", "plan_approved", "plan_rejected", "plan_edited",
  "units_sent", "dispatch_conflict",
  "crew_arrived", "crew_unavailable", "crew_available", "crew_cleared",
  "unit_added", "unit_removed", "data_reset", "manual_plan", "capacity_changed",
];

const activitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    message: { type: String, required: true }, // plain words, shown as-is in History
    actor: { type: String, default: "System" }, // dispatcher name from the session, or "AI" / "System"
    incidentIds: { type: [{ type: ObjectId, ref: "Incident" }], default: [] },
    resourceId: { type: ObjectId, ref: "Resource", default: null },
    planVersion: { type: Number, default: null },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    toJSON: jsonOptions,
    toObject: jsonOptions,
  }
);

activitySchema.index({ createdAt: -1 });

export default mongoose.models.Activity || mongoose.model("Activity", activitySchema);
