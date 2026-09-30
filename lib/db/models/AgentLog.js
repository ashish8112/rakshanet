// Owner: Sam
// AgentLog (collection `agentlogs`), CONTRACT.md 5.1
import mongoose from "mongoose";
import { jsonOptions, ObjectId } from "./shared";

const agentLogSchema = new mongoose.Schema(
  {
    planVersion: { type: Number, required: true },
    incidentId: { type: ObjectId, ref: "Incident", default: null },
    agent: {
      type: String,
      enum: [
        "orchestrator",
        "incident_assessment",
        "route_logistics",
        "resource_allocation",
        "command_planning",
      ],
      required: true,
    },
    message: { type: String, required: true },
    output: { type: mongoose.Schema.Types.Mixed, default: {} }, // raw agent JSON
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    toJSON: jsonOptions,
    toObject: jsonOptions,
    minimize: false, // keep `output: {}` instead of dropping it
  }
);

export default mongoose.models.AgentLog || mongoose.model("AgentLog", agentLogSchema);
