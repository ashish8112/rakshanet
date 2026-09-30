// Owner: Ashish
// GET /api/geocode?q=kristu jayanti -> [{ name, area, lat, lng }] places in and around Bengaluru.
// Uses OpenStreetMap's free Nominatim search from the server (it asks for an identifying User-Agent
// and at most ~1 request per second; the form only searches after the dispatcher stops typing).
import { NextResponse } from "next/server";

// Box around greater Bengaluru: west, north, east, south.
const BENGALURU_BOX = "77.35,13.25,77.85,12.75";

export async function GET(request) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ ok: true, data: [] });

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&viewbox=${BENGALURU_BOX}&bounded=1&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "RakshaNet/1.0 (Bengaluru emergency control room demo)", "Accept-Language": "en" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`search service answered ${res.status}`);
    const results = await res.json();
    const places = results.map((r) => {
      const a = r.address ?? {};
      const name = r.name || r.display_name.split(",")[0];
      const area = a.suburb || a.neighbourhood || a.quarter || a.village || a.town || a.city_district || "Bengaluru";
      return { name, area, label: area && area !== name ? `${name}, ${area}` : name, lat: Number(r.lat), lng: Number(r.lon) };
    });
    return NextResponse.json({ ok: true, data: places });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "SEARCH_UNAVAILABLE", message: "Place search is not responding. Pick an area or click the map instead." } },
      { status: 502 }
    );
  }
}
