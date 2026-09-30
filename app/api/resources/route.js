// Owner: Sam (POST added by Ashish)
import { NextResponse } from "next/server";
import { connectDB, Resource } from "@/lib/db";
import { actorFrom, logActivity, unitName } from "@/lib/activity";

const RESOURCE_KINDS = new Set(["ambulance", "fire_unit", "rescue_team", "hospital", "shelter"]);

// What each kind can do and its code prefix (same rules as the seed data).
const KIND_INFO = {
  ambulance: { prefix: "AMB", label: "Ambulance", capabilities: ["medical"] },
  fire_unit: { prefix: "FIR", label: "Fire Unit", capabilities: ["fire", "rescue"] },
  rescue_team: { prefix: "RES", label: "Rescue Team", capabilities: ["rescue"] },
  hospital: { prefix: "HOS", label: "Hospital", capabilities: ["beds"] },
  shelter: { prefix: "SHE", label: "Shelter", capabilities: ["shelter"] },
};

const bad = (message) => NextResponse.json({ ok: false, error: { code: "INVALID_RESOURCE", message } }, { status: 400 });

// POST /api/resources { kind, location: {lat,lng,area}, vehicleNumber?, name?, capacity? } -> the new Resource
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "INVALID_JSON", message: "Could not read the new unit." } }, { status: 400 });
  }
  const info = KIND_INFO[body?.kind];
  if (!info) return bad("Choose what kind of unit it is.");
  const { location } = body;
  if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng) || typeof location.area !== "string" || !location.area.trim()) {
    return bad("Choose where the unit is based.");
  }
  const place = ["hospital", "shelter"].includes(body.kind);
  const vehicleNumber = typeof body.vehicleNumber === "string" ? body.vehicleNumber.trim().toUpperCase().replace(/\s+/g, " ").slice(0, 20) : "";
  if (!place && !vehicleNumber) return bad("Enter the vehicle number written on the vehicle.");
  const total = Number(body.capacity);
  if (place && (!Number.isInteger(total) || total < 1 || total > 5000)) return bad("Enter how many beds or places it has.");

  try {
    await connectDB();
    if (vehicleNumber && (await Resource.exists({ vehicleNumber }))) return bad(`A unit with number ${vehicleNumber} already exists.`);
    // Next free code, e.g. AMB-09.
    const codes = await Resource.find({ code: new RegExp(`^${info.prefix}-\\d+$`) }, { code: 1 });
    const next = Math.max(0, ...codes.map((r) => Number(r.code.split("-")[1]))) + 1;
    const code = `${info.prefix}-${String(next).padStart(2, "0")}`;
    const area = location.area.trim();
    const resource = await Resource.create({
      code,
      kind: body.kind,
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : `${area} ${info.label} ${String(next).padStart(2, "0")}`,
      vehicleNumber,
      location: { lat: location.lat, lng: location.lng, area },
      status: "available",
      capabilities: info.capabilities,
      capacity: place ? { total, used: 0 } : null,
    });
    await logActivity({ type: "unit_added", actor: await actorFrom(request), resourceId: resource.id, message: `${unitName(resource)} added, based in ${area}${place ? ` with ${total} places` : ""}` });
    return NextResponse.json({ ok: true, data: resource }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: { code: "DATABASE_ERROR", message: "Could not add the unit; check the database connection." } }, { status: 500 });
  }
}

export async function GET(request) {
  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== null && !RESOURCE_KINDS.has(kind)) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_KIND", message: "Could not load resources; check the kind query parameter." } },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const resources = await Resource.find(kind ? { kind } : {}).sort({ code: 1 });
    return NextResponse.json({ ok: true, data: resources });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: "Could not load resources; check the database connection." } },
      { status: 500 }
    );
  }
}
