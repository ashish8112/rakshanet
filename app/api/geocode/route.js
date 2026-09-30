// Owner: Ashish
// GET /api/geocode?q=kristu jayanti -> [{ name, area, label, lat, lng }] places in and around Bengaluru.
// Uses OpenStreetMap's free Nominatim search from the server (it asks for an identifying User-Agent
// and at most ~1 request per second; the form only searches after the dispatcher stops typing).
// Callers are often more precise than the map ("Kristu Jayanti College hostel"): if nothing matches,
// shorter versions of the words are tried ("Kristu Jayanti College", "Kristu Jayanti").
import { NextResponse } from "next/server";

// Box around greater Bengaluru: west, north, east, south.
const BENGALURU_BOX = "77.35,13.25,77.85,12.75";
const MAX_TRIES = 3; // stays within the service's fair-use limit

async function search(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&viewbox=${BENGALURU_BOX}&bounded=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "RakshaNet/1.0 (Bengaluru emergency control room demo)", "Accept-Language": "en" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`search service answered ${res.status}`);
  return res.json();
}

// "Kristu Jayanti College hostel near gate" -> ["Kristu Jayanti College hostel near gate", "Kristu Jayanti College hostel", ...]
function shorterQueries(q) {
  const words = q.replace(/[,.;]/g, " ").split(/\s+/).filter(Boolean);
  const list = [];
  for (let n = words.length; n >= 2 && list.length < MAX_TRIES; n -= 1) list.push(words.slice(0, n).join(" "));
  return list.length ? list : [q];
}

export async function GET(request) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ ok: true, data: [] });

  try {
    let results = [];
    let matched = q;
    for (const attempt of shorterQueries(q)) {
      results = await search(attempt);
      matched = attempt;
      if (results.length) break;
    }
    const places = results.map((r) => {
      const a = r.address ?? {};
      const name = r.name || r.display_name.split(",")[0];
      const area = a.suburb || a.neighbourhood || a.quarter || a.village || a.town || a.city_district || "Bengaluru";
      return { name, area, label: area && area !== name ? `${name}, ${area}` : name, lat: Number(r.lat), lng: Number(r.lon), matched };
    });
    return NextResponse.json({ ok: true, data: places });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "SEARCH_UNAVAILABLE", message: "Place search is not responding. Pick an area or click the map instead." } },
      { status: 502 }
    );
  }
}
