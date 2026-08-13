import { Prisma, RiskLevel } from "@prisma/client";
import { reportSchema, type ReportInput } from "./contracts";
import { prisma } from "./prisma";
import { hashPhone } from "./security";
import { computeRisk } from "./risk-engine";

export async function createSymptomReport(input: ReportInput) {
  const parsed = reportSchema.parse(input);
  const phoneHash = parsed.phone ? hashPhone(parsed.phone) : undefined;

  if (parsed.waterSourceId) {
    const waterSource = await prisma.waterSource.findFirst({
      where: { id: parsed.waterSourceId, locationId: parsed.locationId },
      select: { id: true },
    });
    if (!waterSource) throw new Error("WATER_SOURCE_LOCATION_MISMATCH");
  }

  const duplicate = phoneHash
    ? await prisma.symptomReport.findFirst({
        where: {
          phoneHash,
          locationId: parsed.locationId,
          reportedAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
          symptoms: { hasSome: parsed.symptoms },
        },
        orderBy: { reportedAt: "desc" },
      })
    : null;

  const report = await prisma.symptomReport.create({
    data: {
      locationId: parsed.locationId,
      waterSourceId: parsed.waterSourceId ?? undefined,
      source: parsed.source,
      phoneHash,
      reporterName: parsed.reporterName,
      ageBand: parsed.ageBand,
      symptoms: parsed.symptoms,
      severity: parsed.severity,
      onsetAt: parsed.onsetAt,
      latitude: parsed.latitude !== undefined ? new Prisma.Decimal(parsed.latitude) : undefined,
      longitude: parsed.longitude !== undefined ? new Prisma.Decimal(parsed.longitude) : undefined,
      notes: parsed.notes,
      duplicateOfId: duplicate?.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: parsed.source.toLowerCase(),
      action: duplicate ? "report.duplicate_created" : "report.created",
      entity: "SymptomReport",
      entityId: report.id,
      metadata: { locationId: parsed.locationId, duplicateOfId: duplicate?.id },
    },
  });

  await recalculateLocationRisk(parsed.locationId);
  return report;
}

export async function recalculateAllRisk() {
  const locations = await prisma.location.findMany({ select: { id: true } });
  return Promise.all(locations.map((location) => recalculateLocationRisk(location.id)));
}

export async function recalculateLocationRisk(locationId: string) {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: {
      reports: {
        where: { reportedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      },
      rainfall: {
        where: { observedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      },
      waterSources: true,
    },
  });

  if (!location) throw new Error("LOCATION_NOT_FOUND");

  const risk = computeRisk({
    locationName: location.name,
    population: location.population,
    baselineDailyCases: Number(location.baselineDailyCases),
    vulnerabilityIndex: Number(location.vulnerabilityIndex),
    reports: location.reports,
    rainfall: location.rainfall.map((item) => ({
      observedAt: item.observedAt,
      rainfallMm: Number(item.rainfallMm),
    })),
    waterSources: location.waterSources,
  });

  const score = await prisma.riskScore.create({
    data: {
      locationId: location.id,
      score: risk.score,
      level: risk.level,
      factors: risk.factors,
      reasoning: risk.reasoning,
    },
  });

  const existingOpenAlert = await prisma.alert.findFirst({
    where: {
      locationId: location.id,
      status: { in: ["OPEN", "ACKNOWLEDGED"] },
    },
    orderBy: { triggeredAt: "desc" },
  });

  if (risk.score >= 55) {
    if (!existingOpenAlert || risk.score - existingOpenAlert.score >= 8 || risk.level !== existingOpenAlert.level) {
      await prisma.alert.create({
        data: {
          locationId: location.id,
          riskScoreId: score.id,
          level: risk.level,
          score: risk.score,
          title: `${risk.level[0]}${risk.level.slice(1).toLowerCase()} risk in ${location.name}`,
          message: risk.reasoning,
          recommendedAction: risk.recommendedAction,
        },
      });
    }
  }

  return { location, score, risk };
}

export async function getDashboardData() {
  const [locations, latestScores, openAlerts, reports] = await Promise.all([
    prisma.location.findMany({
      include: { waterSources: true },
      orderBy: [{ district: "asc" }, { name: "asc" }],
    }),
    prisma.riskScore.findMany({
      orderBy: { computedAt: "desc" },
      include: { location: true },
      take: 100,
    }),
    prisma.alert.findMany({
      where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
      include: { location: true },
      orderBy: { triggeredAt: "desc" },
      take: 12,
    }),
    prisma.symptomReport.findMany({
      include: { location: true, waterSource: true },
      orderBy: { reportedAt: "desc" },
      take: 18,
    }),
  ]);

  const latestByLocation = new Map();
  for (const score of latestScores) {
    if (!latestByLocation.has(score.locationId)) latestByLocation.set(score.locationId, score);
  }
  const locationScores = Array.from(latestByLocation.values());
  const criticalCount = locationScores.filter((score) => score.level === RiskLevel.CRITICAL).length;
  const highCount = locationScores.filter((score) => score.level === RiskLevel.HIGH).length;

  return {
    locations,
    latestScores: locationScores,
    latestByLocation,
    openAlerts,
    reports,
    metrics: {
      monitoredLocations: locations.length,
      activeAlerts: openAlerts.length,
      criticalCount,
      highCount,
      reports24h: reports.filter((report) => report.reportedAt >= new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
    },
  };
}
