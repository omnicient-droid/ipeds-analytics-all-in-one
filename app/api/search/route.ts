// app/api/search/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

// ⬅️ relative path to top-level /lib/db.ts
import { prisma } from "../../../lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) return NextResponse.json({ results: [] });
  const numeric = Number(q);
  const where = Number.isFinite(numeric)
    ? {
        OR: [
          { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { unitid: numeric },
        ],
      }
    : { name: { contains: q, mode: Prisma.QueryMode.insensitive } };

  const rows = await prisma.university.findMany({
    where,
    take: 8,
    orderBy: [{ name: "asc" }],
    select: { unitid: true, name: true },
  });

  // nice fallback label if name is null
  const results = rows.map((r) => ({
    unitid: r.unitid,
    name: r.name ?? `UNITID ${r.unitid}`,
  }));

  return NextResponse.json({ results });
}
