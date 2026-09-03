import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        waterSources: {
          include: {
            qualityObservations: { orderBy: { observedAt: "desc" }, take: 3 },
          },
        },
      },
    });

    if (!location) {
      return NextResponse.json({ ok: false, error: "Location not found" }, { status: 404 });
    }

    const now = new Date();
    const latestScore = await prisma.riskScore.findFirst({
      where: { locationId: id },
      orderBy: { computedAt: "desc" },
    });

    const recentReports = await prisma.symptomReport.findMany({
      where: { locationId: id, reportedAt: { gte: subDays(now, 7) } },
      orderBy: { reportedAt: "desc" },
      take: 20,
    });

    const alerts = await prisma.alert.findMany({
      where: { locationId: id, status: { in: ["OPEN", "ACKNOWLEDGED"] } },
      orderBy: { triggeredAt: "desc" },
      take: 5,
    });

    const rainfall72h = await prisma.rainfallObservation.findMany({
      where: {
        locationId: id,
        observedAt: { gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
      },
    });
    const rainfallTotal = rainfall72h.reduce((sum, r) => sum + Number(r.rainfallMm), 0);

    return NextResponse.json({
      ok: true,
      location: {
        id: location.id,
        name: location.name,
        district: location.district,
        state: location.state,
        type: location.type,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        population: location.population,
        households: location.households,
        waterSources: location.waterSources.map((ws) => ({
          id: ws.id,
          name: ws.name,
          type: ws.type,
          status: ws.status,
          lastInspectedAt: ws.lastInspectedAt,
          latestObservation: ws.qualityObservations[0] ?? null,
        })),
        risk: latestScore
          ? {
              score: latestScore.score,
              level: latestScore.level,
              confidence: latestScore.confidence,
              warningLevel: latestScore.warningLevel,
              priority: latestScore.priority,
              dominantSyndrome: latestScore.dominantSyndrome,
              factors: latestScore.factors,
              reasoning: latestScore.reasoning,
              rawMetrics: latestScore.rawMetrics,
            }
          : null,
        recentReports: recentReports.map((r) => ({
          id: r.id,
          source: r.source,
          symptoms: r.symptoms,
          severity: r.severity,
          onsetAt: r.onsetAt,
          reportedAt: r.reportedAt,
          ageBand: r.ageBand,
          notes: r.notes,
        })),
        alerts: alerts.map((a) => ({
          id: a.id,
          status: a.status,
          level: a.level,
          score: a.score,
          priority: a.priority,
          confidence: a.confidence,
          warningLevel: a.warningLevel,
          title: a.title,
          triggeredAt: a.triggeredAt,
        })),
        rainfallMm72h: rainfallTotal,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch location" }, { status: 500 });
  }
}
