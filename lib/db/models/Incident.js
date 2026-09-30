// Owner: Sam
// Incident (collection `incidents`), CONTRACT.md 5.1
import mongoose from "mongoose";
import { locationSchema, jsonOptions, ObjectId } from "./shared";

const incidentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // "INC-001"
    type: {
      type: String,
      enum: ["flood", "fire", "collapse", "accident", "medical", "other"],
      required: true,
    },
    description: { type: String, required: true },
    location: { type: locationSchema, required: true },
    peopleAffected: { type: Number, default: null }, // null = unknown
    status: {
      type: String,
      enum: ["new", "assessing", "needs_info", "planned", "dispatched", "resolved"],
      default: "new",
    },
    severity: { type: Number, min: 1, max: 5, default: null },
    severityConfidence: { type: String, enum: ["high", "low", null], default: null },
    requiredCapabilities: { type: [String], default: [] },
    followUpQuestions: { type: [String], default: [] },
    possibleDuplicateOf: { type: ObjectId, ref: "Incident", default: null },
    assignedResources: { type: [{ type: ObjectId, ref: "Resource" }], default: [] },
  },
  {
    timestamps: { createdAt: "reportedAt", updatedAt: "updatedAt" },
    toJSON: jsonOptions,
    toObject: jsonOptions,
  }
);

export default mongoose.models.Incident || mongoose.model("Incident", incidentSchema);
