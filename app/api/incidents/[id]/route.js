// Owner: Sam
import { NextResponse } from "next/server";
import { connectDB, Incident } from "@/lib/db";

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_ID", message: "Could not load the incident; check its id." } },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const incident = await Incident.findById(id);
    if (!incident) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Could not load the incident; no incident has that id." } },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, data: incident });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: "Could not load the incident; check the database connection." } },
      { status: 500 }
    );
  }
}

const INCIDENT_STATUSES = new Set(["new", "assessing", "needs_info", "planned", "dispatched", "resolved"]);
const PATCH_FIELDS = new Set(["description", "peopleAffected", "location", "status"]);

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_ID", message: "Could not update the incident; check its id." } },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_JSON", message: "Could not parse the incident update; check the JSON body." } },
      { status: 400 }
    );
  }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).length === 0 || Object.keys(body).some((key) => !PATCH_FIELDS.has(key)) ||
      ("description" in body && (typeof body.description !== "string" || !body.description.trim())) ||
      ("peopleAffected" in body && body.peopleAffected !== null && (!Number.isInteger(body.peopleAffected) || body.peopleAffected < 0)) ||
      ("status" in body && !INCIDENT_STATUSES.has(body.status)) ||
      ("location" in body && (!body.location || typeof body.location !== "object" || Array.isArray(body.location) ||
        !Number.isFinite(body.location.lat) || !Number.isFinite(body.location.lng) ||
        Math.abs(body.location.lat) > 90 || Math.abs(body.location.lng) > 180 ||
        typeof body.location.area !== "string" || !body.location.area.trim()))) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_INCIDENT", message: "Could not update the incident; check description, peopleAffected, location, and status." } },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const incident = await Incident.findById(id);
    if (!incident) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Could not update the incident; no incident has that id." } },
        { status: 404 }
      );
    }
    if ("description" in body) incident.description = body.description.trim();
    if ("peopleAffected" in body) incident.peopleAffected = body.peopleAffected;
    if ("location" in body) incident.location = { lat: body.location.lat, lng: body.location.lng, area: body.location.area.trim() };
    if ("status" in body) incident.status = body.status;
    await incident.save();
    return NextResponse.json({ ok: true, data: incident });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INCIDENT", message: "Could not update the incident; check the submitted values." } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: "Could not update the incident; check the database connection." } },
      { status: 500 }
    );
  }
}
