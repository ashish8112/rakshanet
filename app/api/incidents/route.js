// Owner: Sam
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { connectDB, Incident } from "@/lib/db";

const INCIDENT_TYPES = new Set(["flood", "fire", "collapse", "accident", "medical", "other"]);

function errorResponse(code, message, status) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function GET() {
  try {
    await connectDB();
    const incidents = await Incident.find().sort({ severity: -1, reportedAt: -1 });
    return NextResponse.json({ ok: true, data: incidents });
  } catch {
    return errorResponse("DATABASE_ERROR", "Could not load incidents; check the database connection.", 500);
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Could not parse the incident report; check the JSON body.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse("INVALID_INCIDENT", "Could not create the incident; the body must be an object.", 400);
  }

  const { type, description, location, peopleAffected } = body;
  if (!INCIDENT_TYPES.has(type)) {
    return errorResponse("INVALID_INCIDENT", "Could not create the incident; check its type.", 400);
  }
  if (typeof description !== "string" || !description.trim()) {
    return errorResponse("INVALID_INCIDENT", "Could not create the incident; add a description.", 400);
  }
  if (
    !location ||
    typeof location !== "object" ||
    Array.isArray(location) ||
    !Number.isFinite(location.lat) ||
    !Number.isFinite(location.lng) ||
    Math.abs(location.lat) > 90 ||
    Math.abs(location.lng) > 180 ||
    typeof location.area !== "string" ||
    !location.area.trim()
  ) {
    return errorResponse("INVALID_INCIDENT", "Could not create the incident; check location.lat, location.lng, and location.area.", 400);
  }
  if (peopleAffected !== undefined && peopleAffected !== null && (!Number.isInteger(peopleAffected) || peopleAffected < 0)) {
    return errorResponse("INVALID_INCIDENT", "Could not create the incident; peopleAffected must be a nonnegative whole number or null.", 400);
  }

  try {
    const incident = new Incident({
      code: `INC-${randomUUID().slice(0, 8).toUpperCase()}`,
      type,
      description: description.trim(),
      location: { lat: location.lat, lng: location.lng, area: location.area.trim() },
      peopleAffected: peopleAffected ?? null,
      status: "new",
    });
    await incident.validate();
    await connectDB();
    await incident.save();
    return NextResponse.json({ ok: true, data: { ...incident.toJSON(), duplicates: [] } }, { status: 201 });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return errorResponse("INVALID_INCIDENT", "Could not create the incident; check the submitted fields.", 400);
    }
    return errorResponse("DATABASE_ERROR", "Could not save the incident; check the database connection and code uniqueness.", 500);
  }
}
