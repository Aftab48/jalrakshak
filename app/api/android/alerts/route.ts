import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PRIORITY_WEIGHT, WARNING_SEVERITY, LEVEL_SEVERITY } from "@/lib/alert-lifecycle";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const locationId = url.searchParams.get("locationId");

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status.toUpperCase();
    } else {
      where.status = { in: ["OPEN", "ACKNOWLEDGED"] };
    }
    if (locationId) {
      where.locationId = locationId;
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: { location: { select: { id: true, name: true, district: true } } },
      orderBy: { triggeredAt: "desc" },
      take: 100,
    });

    const sorted = [...alerts].sort((a, b) => {
      const activeA = a.status === "OPEN" ? 1 : 0;
      const activeB = b.status === "OPEN" ? 1 : 0;
      if (activeA !== activeB) return activeB - activeA;
      const pw = (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0);
      if (pw !== 0) return pw;
      const ws = (WARNING_SEVERITY[b.warningLevel] ?? 0) - (WARNING_SEVERITY[a.warningLevel] ?? 0);
      if (ws !== 0) return ws;
      const lv = (LEVEL_SEVERITY[b.level] ?? 0) - (LEVEL_SEVERITY[a.level] ?? 0);
      if (lv !== 0) return lv;
      if (b.score !== a.score) return b.score - a.score;
      return b.triggeredAt.getTime() - a.triggeredAt.getTime();
    });

    const result = sorted.map((alert) => ({
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
      location: alert.location,
    }));

    return NextResponse.json({ ok: true, alerts: result });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch alerts" }, { status: 500 });
  }
}
