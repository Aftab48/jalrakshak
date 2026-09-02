import { Prisma, RiskLevel } from "@prisma/client";
import { subDays, subHours } from "date-fns";
import { reportSchema, waterQualityObservationSchema, type ReportInput, type WaterQualityInput } from "./contracts";
import { prisma } from "./prisma";
import { hashPhone } from "./security";
import { computeRisk, RISK_PROFILES } from "./risk-engine";
import { computeDiseaseSignals } from "./disease-engine";
import { computeWaterRisk } from "./water-risk-engine";
import { computePriority } from "./alert-priority-engine";
import { detectLanguage, extractSymptoms, extractDurationDays, parseVoiceReport } from "./voice-intake";

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

  const onsetDays =
    parsed.onsetAt instanceof Date
      ? Math.max(0, (Date.now() - parsed.onsetAt.getTime()) / 86_400_000)
      : null;
  const syndrome = computeDiseaseSignals({ symptoms: parsed.symptoms, onsetDays });

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
      syndromeSignal: syndrome.dominant
        ? {
            syndrome: syndrome.dominant.syndrome,
            percent: syndrome.dominant.percent,
            scores: syndrome.scores,
          }
        : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: parsed.source.toLowerCase(),
      action: duplicate ? "report.duplicate_created" : "report.created",
      entity: "SymptomReport",
      entityId: report.id,
      metadata: { locationId: parsed.locationId, duplicateOfId: duplicate?.id, syndrome: syndrome.dominant?.syndrome },
    },
  });

  await recalculateLocationRisk(parsed.locationId);
  return report;
}

export async function createWaterQualityObservation(input: WaterQualityInput) {
  const parsed = waterQualityObservationSchema.parse(input);
  const observation = await prisma.waterQualityObservation.create({
    data: {
      waterSourceId: parsed.waterSourceId,
      observedAt: parsed.observedAt ?? undefined,
      turbidityNTU: parsed.turbidityNTU ?? undefined,
      ph: parsed.ph ?? undefined,
      tds: parsed.tds ?? undefined,
      freeChlorine: parsed.freeChlorine ?? undefined,
      ecoliDetected: parsed.ecoliDetected ?? undefined,
      inspectionScore: parsed.inspectionScore ?? undefined,
      sampleMethod: parsed.sampleMethod,
      confidence: parsed.confidence,
      notes: parsed.notes,
    },
  });

  const source = await prisma.waterSource.findUniqueOrThrow({
    where: { id: parsed.waterSourceId },
    select: { locationId: true },
  });
  await recalculateLocationRisk(source.locationId);
  return observation;
}

export async function createVoiceReport(input: {
  text: string;
  language?: "hi" | "bn" | "mr" | "te" | "ta" | "gu" | "kn" | "or";
  locationId?: string;
}) {
  const voice = parseVoiceReport(input);
  if (voice.missing.includes("locationId") || voice.missing.includes("symptoms")) {
    throw new Error("VOICE_REPORT_INCOMPLETE");
  }
  const locationId = input.locationId as string;
  const parsed = reportSchema.parse({
    locationId,
    source: "IVR",
    symptoms: voice.symptoms,
    severity: voice.severity,
    onsetAt: new Date(Date.now() - (voice.durationDays ?? 1) * 86_400_000),
    notes: `Voice intake (${voice.language}): ${input.text.slice(0, 200)}`,
  });
  return createSymptomReport(parsed);
}

export async function recalculateAllRisk() {
  const locations = await prisma.location.findMany({ select: { id: true } });
  return Promise.all(locations.map((location) => recalculateLocationRisk(location.id)));
}

export async function recalculateLocationRisk(locationId: string) {
  const now = new Date();
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: {
      reports: {
        where: { reportedAt: { gte: subDays(now, 30) } },
        orderBy: { reportedAt: "asc" },
      },
      rainfall: {
        where: { observedAt: { gte: subDays(now, 14) } },
        orderBy: { observedAt: "asc" },
      },
      waterSources: {
        include: {
          qualityObservations: { orderBy: { observedAt: "desc" }, take: 8 },
        },
      },
    },
  });

  if (!location) throw new Error("LOCATION_NOT_FOUND");

  const rainfall72h = location.rainfall
    .filter((item) => item.observedAt.getTime() >= now.getTime() - 3 * 24 * 60 * 60 * 1000)
    .reduce((sum, item) => sum + Number(item.rainfallMm), 0);

  const risk = computeRisk({
    locationName: location.name,
    population: location.population,
    households: location.households,
    vulnerabilityIndex: Number(location.vulnerabilityIndex),
    fallbackBaseline: Number(location.baselineDailyCases),
    reports: location.reports.map((report) => ({
      reportedAt: report.reportedAt,
      symptoms: report.symptoms,
      phoneHash: report.phoneHash,
      latitude: report.latitude != null ? Number(report.latitude) : null,
      longitude: report.longitude != null ? Number(report.longitude) : null,
      waterSourceId: report.waterSourceId,
      source: report.source,
    })),
    rainfall: location.rainfall.map((item) => ({
      observedAt: item.observedAt,
      rainfallMm: Number(item.rainfallMm),
    })),
    waterObservations: location.waterSources.flatMap((source) =>
      source.qualityObservations.map((observation) => ({
        observedAt: observation.observedAt,
        turbidityNTU: observation.turbidityNTU,
        ph: observation.ph,
        tds: observation.tds,
        freeChlorine: observation.freeChlorine,
        ecoliDetected: observation.ecoliDetected,
        inspectionScore: observation.inspectionScore,
        sampleMethod: observation.sampleMethod,
        confidence: observation.confidence,
      })),
    ),
    waterSources: location.waterSources.map((source) => ({ id: source.id, status: source.status })),
    now,
  });

  const score = await prisma.riskScore.create({
    data: {
      locationId: location.id,
      score: risk.score,
      level: risk.level,
      factors: risk.factors as unknown as Prisma.InputJsonValue,
      reasoning: risk.reasoning,
      confidence: risk.confidence,
      warningLevel: risk.warningLevel,
      priority: risk.priority,
      dominantSyndrome: risk.dominantSyndrome ?? "none",
      windowHours: 72,
      rawMetrics: {
        rawMetrics: risk.rawMetrics,
        reasons: risk.reasons,
        recommendedAction: risk.recommendedAction,
        syndromePercent: risk.syndromePercent,
        warningIndex: risk.warningIndex,
        priorityScore: risk.priorityScore,
        confidenceBreakdown: risk.confidenceBreakdown,
        rainfall72h,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  const existingOpenAlert = await prisma.alert.findFirst({
    where: {
      locationId: location.id,
      status: { in: ["OPEN", "ACKNOWLEDGED"] },
    },
    orderBy: { triggeredAt: "desc" },
  });

  const shouldAlert =
    risk.score >= 55 ||
    risk.priority === "P0" ||
    risk.priority === "P1" ||
    risk.warningLevel === "EARLY_WARNING" ||
    risk.warningLevel === "OUTBREAK";

  if (shouldAlert) {
    const priorityChanged = existingOpenAlert && existingOpenAlert.priority !== risk.priority;
    const escalated = existingOpenAlert && risk.score - existingOpenAlert.score >= 8;
    const levelChanged = existingOpenAlert && risk.level !== existingOpenAlert.level;
    const newBaseline = !existingOpenAlert;

    if (newBaseline || escalated || levelChanged || priorityChanged) {
      await prisma.alert.create({
        data: {
          locationId: location.id,
          riskScoreId: score.id,
          level: risk.level,
          score: risk.score,
          priority: risk.priority,
          confidence: risk.confidence,
          warningLevel: risk.warningLevel,
          title: `${risk.priority === "P0" ? "Immediate" : risk.priority === "P1" ? "Urgent verification" : risk.priority === "P2" ? "Monitor" : "Info"} · ${risk.warningLevel} · ${risk.level} risk in ${location.name}`,
          message: risk.reasoning,
          recommendedAction: risk.recommendedAction.join(" · "),
        },
      });
    }
  }

  return { location, score, risk, rainfall72h };
}

export async function getDashboardData() {
  const since30d = subDays(new Date(), 30);
  const [locations, latestScores, openAlerts, reports, latestObservations, rainfallRecent] = await Promise.all([
    prisma.location.findMany({
      include: { waterSources: true },
      orderBy: [{ district: "asc" }, { name: "asc" }],
    }),
    prisma.riskScore.findMany({
      orderBy: { computedAt: "desc" },
      include: { location: true },
      take: 400,
    }),
    prisma.alert.findMany({
      where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
      include: { location: true },
      orderBy: { triggeredAt: "desc" },
      take: 40,
    }),
    prisma.symptomReport.findMany({
      include: { location: true, waterSource: true },
      orderBy: { reportedAt: "desc" },
      take: 24,
    }),
    prisma.waterQualityObservation.findMany({
      orderBy: { observedAt: "desc" },
      take: 250,
      include: { waterSource: { include: { location: true } } },
    }),
    prisma.rainfallObservation.findMany({
      where: { observedAt: { gte: since30d } },
      include: { location: true },
    }),
  ]);

  const latestByLocation = new Map();
  for (const entry of latestScores) {
    if (!latestByLocation.has(entry.locationId)) latestByLocation.set(entry.locationId, entry);
  }
  const locationScores = Array.from(latestByLocation.values());

  const rainfall72hByLocation = new Map<string, number>();
  const now = Date.now();
  for (const item of rainfallRecent) {
    if (item.observedAt.getTime() >= now - 3 * 86_400_000) {
      rainfall72hByLocation.set(item.locationId, (rainfall72hByLocation.get(item.locationId) ?? 0) + Number(item.rainfallMm));
    }
  }

  const observationsBySource = new Map<string, typeof latestObservations>();
  for (const observation of latestObservations) {
    if (!observationsBySource.has(observation.waterSourceId)) {
      observationsBySource.set(observation.waterSourceId, [observation]);
    } else if (observationsBySource.get(observation.waterSourceId)!.length < 3) {
      observationsBySource.get(observation.waterSourceId)!.push(observation);
    }
  }

  const waterIntelligence = locations.flatMap((location) =>
    location.waterSources.map((source) => {
      const observations = (observationsBySource.get(source.id) ?? []).map((observation) => ({
        observedAt: observation.observedAt,
        turbidityNTU: observation.turbidityNTU,
        ph: observation.ph,
        tds: observation.tds,
        freeChlorine: observation.freeChlorine,
        ecoliDetected: observation.ecoliDetected,
        inspectionScore: observation.inspectionScore,
        sampleMethod: observation.sampleMethod,
        confidence: observation.confidence,
      }));
      const water = computeWaterRisk({
        observations,
        rainfallMm72h: rainfall72hByLocation.get(location.id),
        sourceStatus: source.status,
      });
      const latest = observations[0];
      return {
        id: source.id,
        name: source.name,
        locationName: location.name,
        locationId: location.id,
        type: source.type,
        status: source.status,
        lastInspectedAt: source.lastInspectedAt,
        waterRisk: water.waterRisk,
        warningLevel: water.level,
        turbidityNTU: latest?.turbidityNTU ?? null,
        freeChlorine: latest?.freeChlorine ?? null,
        ecoliDetected: latest?.ecoliDetected ?? null,
        inspectionScore: latest?.inspectionScore ?? null,
        observationCount: observations.length,
        reasons: water.reasons,
        rainfallMm72h: rainfall72hByLocation.get(location.id) ?? 0,
      };
    }),
  );

  const criticalCount = locationScores.filter((score) => score.level === RiskLevel.CRITICAL).length;
  const highCount = locationScores.filter((score) => score.level === RiskLevel.HIGH).length;
  const earlyWarningsCount = locationScores.filter((score) =>
    ["EARLY_WARNING", "OUTBREAK"].includes(score.warningLevel),
  ).length;
  const watchCount = locationScores.filter((score) => score.warningLevel === "WATCH").length;
  const reports24h = reports.filter((report) => report.reportedAt.getTime() >= Date.now() - 24 * 3_600_000).length;

  return {
    locations,
    latestScores: locationScores,
    latestByLocation,
    openAlerts,
    reports,
    waterIntelligence,
    metrics: {
      monitoredLocations: locations.length,
      activeAlerts: openAlerts.length,
      criticalCount,
      highCount,
      earlyWarningsCount,
      watchCount,
      reports24h,
      reportsInFeed: reports.length,
    },
  };
}

export async function runSimulationScenario(scenario: string, locationId?: string) {
  const check = (await import("./simulation-engine")).SCENARIOS[scenario as keyof typeof import("./simulation-engine").SCENARIOS];
  if (!check) throw new Error("UNKNOWN_SCENARIO");

  const target = locationId
    ? await prisma.location.findUniqueOrThrow({ where: { id: locationId }, include: { waterSources: true } })
    : await prisma.location.findFirstOrThrow({ where: { name: { contains: "Maheshtala" } }, include: { waterSources: true } });

  const now = new Date();
  const location = target;

  await prisma.symptomReport.deleteMany({
    where: { source: "SIMULATION", notes: { contains: "scenario:simulation" } },
  });
  await prisma.waterQualityObservation.deleteMany({
    where: { sampleMethod: "SIMULATION", notes: { contains: "scenario:simulation" } },
  });
  await prisma.rainfallObservation.deleteMany({
    where: { source: "synthetic-scenario" },
  });

  const waterSource = location.waterSources[0];
  const today = Array.from({ length: 18 });

  const reportActivities: Record<string, { count: number; hours: number; symptoms: string[]; uniquePhones: number }> = {
    TRUE_OUTBREAK: { count: 14, hours: 20, symptoms: ["diarrhoea", "vomiting", "dehydration"], uniquePhones: 9 },
    HEAVY_RAIN_ONLY: { count: 2, hours: 18, symptoms: ["fever"], uniquePhones: 2 },
    WATER_CONTAMINATION_ONLY: { count: 3, hours: 18, symptoms: ["diarrhoea"], uniquePhones: 3 },
    SEASONAL_INCREASE: { count: 5, hours: 30, symptoms: ["diarrhoea"], uniquePhones: 5 },
    DUPLICATE_REPORT_ATTACK: { count: 22, hours: 5, symptoms: ["diarrhoea", "vomiting"], uniquePhones: 2 },
    SENSOR_DATA_FAILURE: { count: 1, hours: 12, symptoms: ["fever"], uniquePhones: 1 },
    HIDDEN_OUTBREAK: { count: 6, hours: 36, symptoms: ["fever", "weakness", "nausea"], uniquePhones: 5 },
    MULTIPLE_HOTSPOTS: { count: 12, hours: 24, symptoms: ["diarrhoea", "stomach_pain"], uniquePhones: 10 },
  };
  const activity = reportActivities[scenario];

  const reports = today.slice(0, activity.count).map((_, index) => ({
    locationId: location.id,
    waterSourceId: waterSource ? waterSource.id : undefined,
    source: "SIMULATION" as const,
    phoneHash: `scenario-${scenario}-${index % activity.uniquePhones}`,
    symptoms: activity.symptoms,
    severity: scenario === "TRUE_OUTBREAK" ? (index > 8 ? 5 : 4) : 2,
    onsetAt: subHours(now, activity.hours + index),
    reportedAt: subHours(now, 1 + index * 1.5),
    latitude: new Prisma.Decimal(Number(location.latitude) + (Math.random() - 0.5) * 0.004),
    longitude: new Prisma.Decimal(Number(location.longitude) + (Math.random() - 0.5) * 0.004),
    notes: "scenario:simulation",
  }));

  const rainfall = scenario === "HEAVY_RAIN_ONLY" || scenario === "TRUE_OUTBREAK"
    ? [70, 55, 40].map((amount, index) => ({
        locationId: location.id,
        observedAt: subHours(now, (index + 1) * 24),
        rainfallMm: new Prisma.Decimal(amount),
        source: "synthetic-scenario",
      }))
    : scenario === "HIDDEN_OUTBREAK" || scenario === "SEASONAL_INCREASE"
      ? [25, 20, 15].map((amount, index) => ({
          locationId: location.id,
          observedAt: subHours(now, (index + 1) * 24),
          rainfallMm: new Prisma.Decimal(amount),
          source: "synthetic-scenario",
        }))
      : [];

  const waterRules: Record<string, { turbidity: number; chlorine: number; ecoli: boolean; inspection: number }> = {
    TRUE_OUTBREAK: { turbidity: 11, chlorine: 0.1, ecoli: true, inspection: 35 },
    WATER_CONTAMINATION_ONLY: { turbidity: 9, chlorine: 0.15, ecoli: true, inspection: 40 },
    HIDDEN_OUTBREAK: { turbidity: 6, chlorine: 0.3, ecoli: true, inspection: 55 },
    SEASONAL_INCREASE: { turbidity: 4, chlorine: 0.5, ecoli: false, inspection: 70 },
  };
  const waterRule = waterRules[scenario];
  const water = waterRule && waterSource
    ? [
        {
          waterSourceId: waterSource.id,
          observedAt: now,
          turbidityNTU: waterRule.turbidity,
          freeChlorine: waterRule.chlorine,
          ecoliDetected: waterRule.ecoli,
          inspectionScore: waterRule.inspection,
          sampleMethod: "SIMULATION" as const,
          confidence: 0.7,
          notes: "scenario:simulation",
        },
      ]
    : [];

  await prisma.symptomReport.createMany({ data: reports });
  await prisma.rainfallObservation.createMany({ data: rainfall });
  await prisma.waterQualityObservation.createMany({ data: water });

  const result = await recalculateLocationRisk(location.id);
  return { location: location.name, scenario, expected: check.expected, risk: result.risk, rainfall, waterReports: water.length };
}

export { RISK_PROFILES, computePriority, detectLanguage, extractSymptoms, extractDurationDays };

export function getWeightsSummary() {
  return RISK_PROFILES;
}