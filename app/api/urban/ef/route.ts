import { NextRequest, NextResponse } from "next/server";

const BASE = "https://educationdata.urban.org/api/v1/college-university/ipeds";

export const runtime = "nodejs"; // ensure Node runtime
export const dynamic = "force-dynamic"; // avoid caching while developing

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const unitid = u.searchParams.get("unitid");
  const year = u.searchParams.get("year");
  if (!unitid || !year) {
    return NextResponse.json(
      { error: "unitid and year are required" },
      { status: 400 }
    );
  }
  const upstream = `${BASE}/ef/${encodeURIComponent(
    year
  )}?unitid=${encodeURIComponent(unitid)}`;
  const r = await fetch(upstream, { headers: { accept: "application/json" } });
  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") ?? "application/json",
    },
  });
}
