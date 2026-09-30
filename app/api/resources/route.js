// Owner: Sam
import { NextResponse } from "next/server";
import { connectDB, Resource } from "@/lib/db";

const RESOURCE_KINDS = new Set(["ambulance", "fire_unit", "rescue_team", "hospital", "shelter"]);

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
