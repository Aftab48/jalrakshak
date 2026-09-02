import type { WarningLevel } from "./early-warning-types";
import { computeDiseaseSignals } from "./disease-engine";
import { computeAnomaly, buildDailyCounts, type AnomalyOutput } from "./anomaly-engine";
import { computeWaterRisk, type WaterObservationInput, type WaterRiskOutput } from "./water-risk-engine";
import { computeSpatialClusters, type SpatialOutput } from "./spatial-engine";
import { computeConfidence, type ConfidenceOutput } from "./confidence-engine";

export type EarlyWarningReportLike = {
  reportedAt: Date;
  symptoms: string[];
  phoneHash?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  severity?: number | null;
  source?: string | null;
};

export type EarlyWarningInput = {
  locationName: string;
  population?: number;
  households?: number;
  vulnerabilityIndex: number;
  reports: EarlyWarningReportLike[];
  rainfall: { observedAt: Date; rainfallMm: number }[];
  waterObservations: WaterObservationInput[];
  waterSources: { id: string; status: "NORMAL" | "WATCH" | "SUSPECTED" | "CONTAMINATED" }[];
  fallbackBaseline?: number;
  now?: Date;
};

export type TrendSignal = {
  reportCount24h: number;
  previousRate: number;
  growthRatio: number;
  score: number;
};

export type EnvironmentalSignal = {
  rainfallMm72h: number;
  score: number;
};

export type EarlyWarningOutput = {
  anomaly: AnomalyOutput;
  trend: TrendSignal;
  environmental: EnvironmentalSignal;
  water: WaterRiskOutput;
  spatial: SpatialOutput;
  dominantSyndrome: string | null;
  warningIndex: number;
  warningLevel: WarningLevel;
  confidence: ConfidenceOutput;
  reasons: string[];
};

const WINDOW_MS = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function computeTrend(reports: { reportedAt: Date }[], now: Date): TrendSignal {
  const nowMs = now.getTime();
  const recent24h = reports.filter((report) => report.reportedAt.getTime() >= nowMs - WINDOW_MS).length;
  const previous = reports.filter((report) => {
    const time = report.reportedAt.getTime();
    return time >= nowMs - 3 * WINDOW_MS && time < nowMs - WINDOW_MS;
  }).length;
  const previousRate = previous / 2;

  const growthRatio = previousRate > 0 ? (recent24h - previousRate) / previousRate : recent24h >= 3 ? 1 : recent24h / 3;
  const score = clamp(round2(growthRatio), 0, 1);
  return { reportCount24h: recent24h, previousRate: round2(previousRate), growthRatio: round2(growthRatio), score };
}

function computeEnvironmental(rainfall: { observedAt: Date; rainfallMm: number }[], now: Date): EnvironmentalSignal {
  const rainfall72h = rainfall
    .filter((item) => item.observedAt.getTime() >= now.getTime() - 3 * WINDOW_MS)
    .reduce((sum, item) => sum + item.rainfallMm, 0);
  return { rainfallMm72h: round2(rainfall72h), score: clamp(round2(rainfall72h / 120), 0, 1) };
}

export function computeEarlyWarning(input: EarlyWarningInput): EarlyWarningOutput {
  const now = input.now ?? new Date();
  const { historicalCounts, currentCount } = buildDailyCounts(input.reports, now, 14);

  const anomaly = computeAnomaly({ historicalCounts, currentCount });
  const trend = computeTrend(input.reports, now);
  const environmental = computeEnvironmental(input.rainfall, now);
  const water = computeWaterRisk({
    observations: input.waterObservations,
    rainfallMm72h: environmental.rainfallMm72h,
    sourceStatus: worstWaterStatus(input.waterSources),
    now,
  });
  const reportsIn72h = input.reports.filter((report) => report.reportedAt.getTime() >= now.getTime() - 3 * WINDOW_MS);
  const spatial = computeSpatialClusters({
    reports: reportsIn72h.map((report) => ({
      id: undefined,
      latitude: report.latitude,
      longitude: report.longitude,
      symptoms: report.symptoms,
      phoneHash: report.phoneHash,
    })),
  });

  const diseases = computeDiseaseSignals({
    symptoms: recentSymptoms(input.reports, now),
  });

  const warningIndex = round2(
    0.25 * anomaly.anomalyScore +
      0.18 * trend.score +
      0.3 * (water.waterRisk / 100) +
      0.15 * environmental.score +
      0.12 * spatial.spatialSignal,
  );

  const confidence = computeConfidence({
    reportCount72h: reportsIn72h.length,
    uniqueReporterCount: new Set(reportsIn72h.map((report) => report.phoneHash).filter(Boolean)).size,
    sourceCount: new Set(input.reports.map((report) => report.source).filter(Boolean)).size || 1,
    hasRainfall: input.rainfall.length > 0,
    hasWaterObservations: input.waterObservations.length > 0,
    waterObservationFresh: input.waterObservations.filter((observation) => {
      if (!observation.observedAt) return true;
      return now.getTime() - observation.observedAt.getTime() <= 48 * 3_600_000;
    }).length,
    hasSpatialCluster: spatial.strongest !== null,
    duplicateUncertainty: Math.min(1, duplicateRatio(input.reports)),
  });

  const warningLevel = deriveWarningLevel({
    warningIndex,
    anomalyLevel: anomaly.level,
    trendScore: trend.score,
    waterRisk: water.waterRisk,
    confidence: confidence.confidence,
  });

  const reasons: string[] = [];
  reasons.push(...anomaly.reasons.slice(0, 2));
  if (trend.growthRatio > 0.5) reasons.push(`${round2(trend.growthRatio * 100)}% growth in reports over the last 24h`);
  reasons.push(...water.reasons.slice(0, 3));
  if (environmental.rainfallMm72h >= 60)
    reasons.push(`${environmental.rainfallMm72h}mm rainfall over the last 72h`);
  reasons.push(...spatial.reasons.slice(0, 1));
  if (diseases.dominant) reasons.push(diseases.reasons[0]);

  return {
    anomaly,
    trend,
    environmental,
    water,
    spatial,
    dominantSyndrome: diseases.dominant?.syndrome ?? null,
    warningIndex,
    warningLevel,
    confidence,
    reasons: reasons.slice(0, 8),
  };
}

function deriveWarningLevel(params: {
  warningIndex: number;
  anomalyLevel: string;
  trendScore: number;
  waterRisk: number;
  confidence: number;
}): WarningLevel {
  const { warningIndex, anomalyLevel, trendScore, waterRisk, confidence } = params;
  const lowConfidenceCap: WarningLevel = confidence < 40 ? "EARLY_WARNING" : "OUTBREAK";
  const candidate: WarningLevel =
    (anomalyLevel === "STRONG_ANOMALY" && trendScore >= 0.45) ||
    warningIndex >= 0.7 ||
    // water-driven outbreak needs both a degraded water supply AND rising cases
    (waterRisk >= 70 && trendScore >= 0.5 && warningIndex >= 0.6)
      ? "OUTBREAK"
      : warningIndex >= 0.42 || waterRisk >= 50 || anomalyLevel === "EARLY_WARNING"
        ? "EARLY_WARNING"
        : warningIndex >= 0.24 || anomalyLevel === "WATCH"
          ? "WATCH"
          : "NORMAL";

  const order: Record<WarningLevel, number> = { NORMAL: 0, WATCH: 1, EARLY_WARNING: 2, OUTBREAK: 3 };
  return order[candidate] <= order[lowConfidenceCap] ? candidate : lowConfidenceCap;
}

function worstWaterStatus(
  sources: { status: "NORMAL" | "WATCH" | "SUSPECTED" | "CONTAMINATED" }[],
): "NORMAL" | "WATCH" | "SUSPECTED" | "CONTAMINATED" | null {
  if (!sources.length) return null;
  const order = { CONTAMINATED: 3, SUSPECTED: 2, WATCH: 1, NORMAL: 0 } as const;
  return [...sources].sort((a, b) => order[b.status] - order[a.status])[0].status;
}

function recentSymptoms(reports: EarlyWarningReportLike[], now: Date, hours = 72) {
  return reports
    .filter((report) => report.reportedAt.getTime() >= now.getTime() - hours * 3_600_000)
    .flatMap((report) => report.symptoms);
}

function duplicateRatio(reports: { phoneHash?: string | null }[]) {
  const distinct = new Set(reports.map((report) => report.phoneHash).filter(Boolean)).size;
  const total = reports.length;
  if (!total) return 0;
  const ratio = 1 - distinct / total;
  return Math.max(0, ratio - 0.3); // tolerate up to 30% natural re-reporting
}