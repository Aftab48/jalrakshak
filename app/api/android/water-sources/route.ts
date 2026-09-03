import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const locationId = url.searchParams.get("locationId");

    const where: Record<string, unknown> = {};
    if (locationId) {
      where.locationId = locationId;
    }

    const sources = await prisma.waterSource.findMany({
      where,
      include: {
        location: { select: { id: true, name: true, district: true } },
        qualityObservations: { orderBy: { observedAt: "desc" }, take: 1 },
      },
      orderBy: { name: "asc" },
    });

    const result = sources.map((source) => ({
      id: source.id,
      name: source.name,
      type: source.type,
      status: source.status,
      lastInspectedAt: source.lastInspectedAt,
      notes: source.notes,
      location: source.location,
      latestObservation: source.qualityObservations[0] ?? null,
    }));

    return NextResponse.json({ ok: true, waterSources: result });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch water sources" }, { status: 500 });
  }
}
