// Owner: Sam
// Resource (collection `resources`), CONTRACT.md 5.1
import mongoose from "mongoose";
import { locationSchema, jsonOptions, ObjectId } from "./shared";

// Only hospitals and shelters have capacity; units have capacity: null.
const capacitySchema = new mongoose.Schema(
  {
    total: { type: Number, required: true },
    used: { type: Number, default: 0 },
  },
  { _id: false }
);

const resourceSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // "AMB-01"
    kind: {
      type: String,
      enum: ["ambulance", "fire_unit", "rescue_team", "hospital", "shelter"],
      required: true,
    },
    name: { type: String, required: true },
    location: { type: locationSchema, required: true },
    status: {
      type: String,
      enum: ["available", "reserved", "en_route", "on_scene", "unavailable"],
      default: "available",
    },
    capabilities: { type: [String], default: [] },
    capacity: { type: capacitySchema, default: null },
    assignedIncident: { type: ObjectId, ref: "Incident", default: null },
  },
  {
    timestamps: { createdAt: false, updatedAt: "updatedAt" },
    toJSON: jsonOptions,
    toObject: jsonOptions,
  }
);

export default mongoose.models.Resource || mongoose.model("Resource", resourceSchema);
