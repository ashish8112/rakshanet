// Owner: Sam
// Plan (collection `plans`), CONTRACT.md 5.1
import mongoose from "mongoose";
import { jsonOptions, ObjectId } from "./shared";

const assignmentSchema = new mongoose.Schema(
  {
    incidentId: { type: ObjectId, ref: "Incident", required: true },
    resourceId: { type: ObjectId, ref: "Resource", required: true },
    destinationId: { type: ObjectId, ref: "Resource", default: null }, // hospital/shelter or null
    distanceKm: { type: Number, required: true },
    etaMinutes: { type: Number, required: true },
    reason: { type: String, default: "" },
  },
  { _id: false }
);

const uncoveredSchema = new mongoose.Schema(
  {
    incidentId: { type: ObjectId, ref: "Incident", required: true },
    reason: { type: String, default: "" },
    expectedDelayMinutes: { type: Number, default: null },
  },
  { _id: false }
);

const alternativeSchema = new mongoose.Schema(
  { summary: String, tradeoff: String },
  { _id: false }
);

const changeSchema = new mongoose.Schema(
  { what: String, why: String },
  { _id: false }
);

const planSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    status: {
      type: String,
      enum: ["proposed", "approved", "rejected", "committed", "superseded", "stale"],
      default: "proposed",
    },
    trigger: {
      type: String,
      enum: ["new_incident", "resource_change", "responder_update", "manual", "edit"],
      required: true,
    },
    summary: { type: String, default: "" },
    assignments: { type: [assignmentSchema], default: [] },
    uncovered: { type: [uncoveredSchema], default: [] },
    alternatives: { type: [alternativeSchema], default: [] },
    changes: { type: [changeSchema], default: [] }, // empty for the first plan
    dispatcherNote: { type: String, default: "" },
    source: { type: String, enum: ["ai", "backup", "manual"], default: "ai" }, // "backup" = rules while Gemini was unavailable; "manual" = chosen by the dispatcher
    decidedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    toJSON: jsonOptions,
    toObject: jsonOptions,
  }
);

export default mongoose.models.Plan || mongoose.model("Plan", planSchema);
