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
