import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        location: {
          include: {
            waterSources: {
              include: {
                qualityObservations: { orderBy: { observedAt: "desc" }, take: 2 },
              },
            },
          },
        },
        riskScore: true,
      },
    });

    if (!alert) {
      return NextResponse.json({ ok: false, error: "Alert not found" }, { status: 404 });
    }

    const now = new Date();
    const recentReports = await prisma.symptomReport.findMany({
      where: {
        locationId: alert.locationId,
        reportedAt: { gte: subDays(now, 7) },
      },
      orderBy: { reportedAt: "desc" },
      take: 10,
    });

    const rawMetrics = alert.riskScore?.rawMetrics as Record<string, unknown> | null;

    return NextResponse.json({
      ok: true,
      alert: {
        id: alert.id,
        status: alert.status,
        level: alert.level,
        score: alert.score,
        priority: alert.priority,
        confidence: alert.confidence,
        warningLevel: alert.warningLevel,
        title: alert.title,
        message: alert.message,
        recommendedAction: alert.recommendedAction,
        triggeredAt: alert.triggeredAt,
        acknowledgedAt: alert.acknowledgedAt,
        resolvedAt: alert.resolvedAt,
        location: {
          id: alert.location.id,
          name: alert.location.name,
          district: alert.location.district,
          state: alert.location.state,
          latitude: Number(alert.location.latitude),
          longitude: Number(alert.location.longitude),
          population: alert.location.population,
          households: alert.location.households,
        },
        factors: alert.riskScore?.factors ?? null,
        reasoning: alert.riskScore?.reasoning ?? alert.message,
        dominantSyndrome: alert.riskScore?.dominantSyndrome ?? "none",
        rawMetrics: rawMetrics
          ? {
              reportCount72h: rawMetrics.reportCount72h,
              reportCount24h: rawMetrics.reportCount24h,
              uniqueReporterCount: rawMetrics.uniqueReporterCount,
              rainfallMm72h: rawMetrics.rainfallMm72h,
              waterRisk: rawMetrics.waterRisk,
              estimatedExposedPopulation: rawMetrics.estimatedExposedPopulation,
              syndromePercent: rawMetrics.syndromePercent,
              reasons: rawMetrics.reasons,
              recommendedAction: rawMetrics.recommendedAction,
            }
          : null,
        waterSources: alert.location.waterSources.map((ws) => ({
          id: ws.id,
          name: ws.name,
          type: ws.type,
          status: ws.status,
          latestObservation: ws.qualityObservations[0] ?? null,
        })),
        recentReports: recentReports.map((r) => ({
          id: r.id,
          source: r.source,
          symptoms: r.symptoms,
          severity: r.severity,
          reportedAt: r.reportedAt,
          ageBand: r.ageBand,
        })),
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch alert" }, { status: 500 });
  }
}
