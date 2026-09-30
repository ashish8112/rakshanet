// Owner: Ashish
// GET /api/activity?incidentId=...&limit=200 -> Activity[] newest first (the control room History)
import { NextResponse } from "next/server";
import { connectDB, Activity } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const incidentId = params.get("incidentId");
  const limit = Math.min(Math.max(Number(params.get("limit")) || 200, 1), 500);
  if (incidentId && !/^[0-9a-fA-F]{24}$/.test(incidentId)) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_ID", message: "Could not load history; check the emergency id." } }, { status: 400 });
  }
  try {
    await connectDB();
    const activities = await Activity.find(incidentId ? { incidentIds: incidentId } : {}).sort({ createdAt: -1, _id: -1 }).limit(limit);
    return NextResponse.json({ ok: true, data: activities });
  } catch {
    return NextResponse.json({ ok: false, error: { code: "DATABASE_ERROR", message: "Could not load history; check the database connection." } }, { status: 500 });
  }
}
