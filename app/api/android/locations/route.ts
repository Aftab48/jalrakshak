import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RiskLevel } from "@prisma/client";

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      include: {
        waterSources: { select: { id: true, name: true, type: true, status: true } },
      },
      orderBy: [{ district: "asc" }, { name: "asc" }],
    });

    const latestScores = await prisma.riskScore.findMany({
      orderBy: { computedAt: "desc" },
      take: 400,
    });

    const latestByLocation = new Map<string, typeof latestScores[0]>();
    for (const entry of latestScores) {
      if (!latestByLocation.has(entry.locationId)) latestByLocation.set(entry.locationId, entry);
    }

    const result = locations.map((location) => {
      const score = latestByLocation.get(location.id);
      return {
        id: location.id,
        name: location.name,
        district: location.district,
        state: location.state,
        type: location.type,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        population: location.population,
        households: location.households,
        waterSources: location.waterSources,
        risk: score
          ? {
              score: score.score,
              level: score.level,
              confidence: score.confidence,
              warningLevel: score.warningLevel,
              priority: score.priority,
              dominantSyndrome: score.dominantSyndrome,
            }
          : null,
      };
    });

    return NextResponse.json({ ok: true, locations: result });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch locations" }, { status: 500 });
  }
}
