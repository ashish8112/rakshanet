// Owner: Sam
import { NextResponse } from "next/server";
import { connectDB, Incident, Resource, Plan, AgentLog, Activity } from "@/lib/db";
import { actorFrom, logActivity } from "@/lib/activity";
import resourceSeeds from "@/data/resources.json";
import incidentSeeds from "@/data/demo-incidents.json";

async function validateSeedData() {
  if (!Array.isArray(resourceSeeds) || !Array.isArray(incidentSeeds)) {
    throw new Error("Seed files must contain arrays");
  }

  const codes = [...resourceSeeds, ...incidentSeeds].map((item) => item.code);
  if (codes.some((code) => typeof code !== "string" || !code) || new Set(codes).size !== codes.length) {
    throw new Error("Seed files must have unique nonempty codes");
  }

  for (const item of resourceSeeds) {
    await new Resource(item).validate();
    if (item.capacity && (item.capacity.used < 0 || item.capacity.used > item.capacity.total)) {
      throw new Error("Resource capacity must be between zero and total");
    }
  }
  for (const item of incidentSeeds) {
    await new Incident(item).validate();
  }
}

export async function POST(request) {
  try {
    await validateSeedData();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_SEED_DATA", message: "Could not reset demo data; check the seed JSON files." } },
      { status: 500 }
    );
  }

  try {
    const mongoose = await connectDB();
    for (const Model of [Resource, Incident, Plan, AgentLog, Activity]) {
      await Model.init();
    }

    await mongoose.connection.transaction(async (session) => {
      await AgentLog.deleteMany({}).session(session);
      await Activity.deleteMany({}).session(session);
      await Plan.deleteMany({}).session(session);
      await Incident.deleteMany({}).session(session);
      await Resource.deleteMany({}).session(session);
      await Resource.insertMany(resourceSeeds, { session, ordered: true });
      await Incident.insertMany(incidentSeeds, { session, ordered: true });
    });

    await logActivity({ type: "data_reset", actor: await actorFrom(request), message: `Demo data reset: ${incidentSeeds.length} open emergencies, ${resourceSeeds.length} units, hospitals and shelters` });
    return NextResponse.json({
      ok: true,
      data: { incidents: incidentSeeds.length, resources: resourceSeeds.length },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: "Could not reset demo data; check the database connection and transaction support." } },
      { status: 500 }
    );
  }
}
