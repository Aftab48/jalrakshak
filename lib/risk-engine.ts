import type { RiskLevel } from "@prisma/client";
import type { WarningLevel } from "./early-warning-types";
import type { SyndromeProfile } from "./syndromes";
import { SYNDROME_LABELS } from "./syndromes";
import { computeEarlyWarning, type EarlyWarningInput } from "./early-warning-engine";
import { computePriority, type AlertPriorityLabel } from "./alert-priority-engine";
import { computeDiseaseSignals } from "./disease-engine";
import type { ConfidenceBreakdown } from "./confidence-engine";

export type RiskReportLike = {
  reportedAt: Date;
  symptoms: string[];
  phoneHash?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  waterSourceId?: string | null;
  source?: string | null;
};

export type RiskInput = EarlyWarningInput & {
  locationName: string;
  population: number;
  households: number;
  fallbackBaseline: number;
};

export type RiskFactorWeights = {
  diseaseSignal: number;
  anomaly: number;
  growth: number;
  water: number;
  environmental: number;
  spatial: number;
  vulnerability: number;
};

export type NormalizedFactors = {
  diseaseSignal: number;
  anomaly: number;
  growth: number;
  water: number;
  environmental: number;
  spatial: number;
  vulnerability: number;
  exposure: number;
};

export type RawMetrics = {
  reportCount72h: number;
  reportCount24h: number;
  uniqueReporterCount: number;
  ratioToBaseline: number;
  zScore: number;
  baselineDailyRate: number;
  rainfallMm72h: number;
  waterRisk: number;
  clusterHouseholds: number;
  populationExposure: number;
  duplicateRatio: number;
  estimatedExposedPopulation: number;
};

export type RiskOutput = {
  score: number;
  level: RiskLevel;
  factors: NormalizedFactors;
  rawMetrics: RawMetrics;
  confidence: number;
  confidenceBreakdown: ConfidenceBreakdown;
  warningIndex: number;
  warningLevel: WarningLevel;
  dominantSyndrome: SyndromeProfile | null;
  syndromePercent: number | null;
  priority: AlertPriorityLabel;
  priorityScore: number;
  reasons: string[];
  recommendedAction: string[];
  reasoning: string;
};

/**
 * Default prototype weights — configurable starting values, NOT clinically
 * validated coefficients. The same seven normalized signals are re-weighted per
 * dominant syndrome so the intelligence stays explainable.
 */
export const RISK_PROFILES: Record<SyndromeProfile, RiskFactorWeights> & { default: RiskFactorWeights } = {
  acute_diarrheal: {
    diseaseSignal: 0.3,
    anomaly: 0.2,
    growth: 0.15,
    water: 0.15,
    environmental: 0.08,
    spatial: 0.07,
    vulnerability: 0.05,
  },
  typhoid_like: {
    diseaseSignal: 0.3,
    anomaly: 0.18,
    growth: 0.13,
    water: 0.16,
    environmental: 0.09,
    spatial: 0.09,
    vulnerability: 0.05,
  },
  hepatitis_like: {
    diseaseSignal: 0.28,
    anomaly: 0.18,
    growth: 0.12,
    water: 0.18,
    environmental: 0.1,
    spatial: 0.09,
    vulnerability: 0.05,
  },
  default: {
    diseaseSignal: 0.3,
    anomaly: 0.2,
    growth: 0.15,
    water: 0.15,
    environmental: 0.08,
    spatial: 0.07,
    vulnerability: 0.05,
  },
};

const WINDOW_MS = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeRisk(input: RiskInput): RiskOutput {
  const now = input.now ?? new Date();
  const early = computeEarlyWarning(input);

  const reports72h = input.reports.filter((report) => report.reportedAt.getTime() >= now.getTime() - 3 * WINDOW_MS);
  const reports24h = input.reports.filter((report) => report.reportedAt.getTime() >= now.getTime() - WINDOW_MS);
  const uniqueReporters = new Set(reports72h.map((report) => report.phoneHash).filter(Boolean));
  const duplicateRatio =
    reports72h.length > 0 ? Math.max(0, 1 - uniqueReporters.size / Math.max(reports72h.length, 1)) : 0;

  // --- Signal assembly (all normalized 0..1) -----------------------------------------
  const disease = computeDiseaseSignals({
    symptoms: input.reports
      .filter((report) => report.reportedAt.getTime() >= now.getTime() - 3 * WINDOW_MS)
      .flatMap((report) => report.symptoms),
  });
  const dominant = disease.dominant;
  const dominantSignal = dominant
    ? {
        syndrome: dominant.syndrome as SyndromeProfile,
        percent: dominant.percent,
      }
    : null;

  const pressure = clamp(reports72h.length / Math.max(6, input.fallbackBaseline * 4), 0, 1);
  const diseaseSignal = round1(clamp(0.6 * (dominantSignal ? dominantSignal.percent / 100 : 0.25) + 0.4 * pressure, 0, 1));

  const anomaly = round1(early.anomaly.anomalyScore);
  const growth = round1(early.trend.score);
  const water = round1(early.water.waterRisk / 100);
  const environmental = round1(early.environmental.score);
  const spatial = round1(early.spatial.spatialSignal);
  const vulnerability = round1(clamp(input.vulnerabilityIndex, 0, 1));

  const avgHouseholdSize = input.households > 0 ? input.population / input.households : 5;
  const uniqueReporters72h = uniqueReporters.size;
  const exposure = round2(clamp((uniqueReporters72h * avgHouseholdSize) / Math.max(input.households, 1), 0, 1));

  const factors: NormalizedFactors = {
    diseaseSignal,
    anomaly,
    growth,
    water,
    environmental,
    spatial,
    vulnerability,
    exposure,
  };

  // --- Weighted combination -----------------------------------------------------------
  const weights = RISK_PROFILES[dominantSignal?.syndrome ?? "default"] ?? RISK_PROFILES.default;
  const risk =
    weights.diseaseSignal * factors.diseaseSignal +
    weights.anomaly * factors.anomaly +
    weights.growth * factors.growth +
    weights.water * factors.water +
    weights.environmental * factors.environmental +
    weights.spatial * factors.spatial +
    weights.vulnerability * factors.vulnerability;

  const score = clamp(Math.round(risk * 100), 0, 100);
  const level: RiskLevel = score >= 75 ? "CRITICAL" : score >= 55 ? "HIGH" : score >= 32 ? "MODERATE" : "LOW";

  // --- Confidence (separate from risk) ------------------------------------------------
  const confidence = early.confidence;

  // --- Priority -----------------------------------------------------------------------
  const priority = computePriority({
    risk: score,
    confidence: confidence.confidence,
    populationExposure: exposure,
    vulnerability,
    growth,
  });

  const estimatedExposedPopulation = Math.round(exposure * input.population);

  // --- Explanation --------------------------------------------------------------------
  const reasons: string[] = [];
  if (dominantSignal) {
    reasons.push(
      `Dominant syndrome signal: ${SYNDROME_LABELS[dominantSignal.syndrome]} — ${dominantSignal.percent}% pattern match`,
    );
  }
  if (early.anomaly.ratioToBaseline > 1) {
    reasons.push(`${early.anomaly.ratioToBaseline}× symptom reports vs. historical baseline`);
  }
  if (growth >= 0.4) reasons.push(`${round1(growth * 100)}% report growth in the last 24h`);
  if (early.water.waterRisk >= 45) {
    reasons.push(`water risk ${early.water.waterRisk}/100 — ${early.water.reasons.slice(0, 2).join("; ")}`);
  }
  if (early.environmental.rainfallMm72h >= 60) {
    reasons.push(`${early.environmental.rainfallMm72h}mm heavy rainfall over 72h`);
  }
  if (early.spatial.strongest) {
    const people = early.spatial.strongest.uniqueReporters || early.spatial.strongest.members;
    reasons.push(`${people} related households clustered within ~${Math.max(early.spatial.strongest.radiusMeters, 150)} m`);
  }
  if (vulnerability >= 0.4) reasons.push(`high-vulnerability population exposure (index ${vulnerability.toFixed(2)})`);
  if (duplicateRatio > 0.3) reasons.push("duplicate-report pressure detected — reports come from very few phones");

  const recommendedAction = actionsFor({ level, priority: priority.priority, confidence: confidence.confidence });

  return {
    score,
    level,
    factors,
    rawMetrics: {
      reportCount72h: reports72h.length,
      reportCount24h: reports24h.length,
      uniqueReporterCount: uniqueReporters.size,
      ratioToBaseline: early.anomaly.ratioToBaseline,
      zScore: early.anomaly.zScore,
      baselineDailyRate: early.anomaly.baselineDailyRate,
      rainfallMm72h: early.environmental.rainfallMm72h,
      waterRisk: early.water.waterRisk,
      clusterHouseholds: early.spatial.strongest?.uniqueReporters || early.spatial.strongest?.members || 0,
      populationExposure: exposure,
      duplicateRatio: round1(duplicateRatio),
      estimatedExposedPopulation,
    },
    confidence: confidence.confidence,
    confidenceBreakdown: confidence.breakdown,
    warningIndex: early.warningIndex,
    warningLevel: early.warningLevel,
    dominantSyndrome: dominantSignal?.syndrome ?? null,
    syndromePercent: dominantSignal?.percent ?? null,
    priority: priority.priority,
    priorityScore: priority.priorityScore,
    reasons,
    recommendedAction,
    reasoning: `${input.locationName}: ${level.toLowerCase()} risk (${score}/100) because ${reasons.slice(0, 4).join("; ") || "no unusual signals detected"}.`,
  };
}

function actionsFor(params: { level: RiskLevel; priority: AlertPriorityLabel; confidence: number }): string[] {
  if (params.priority === "P0" || params.level === "CRITICAL") {
    return [
      "Dispatch field verification team to the location now",
      "Inspect the shared water point and collect water samples",
      "Issue precautionary boil-water advisory",
      "Prepare ORS and rehydration supplies",
    ];
  }
  if (params.priority === "P1" || params.level === "HIGH") {
    return [
      "Ask ASHA/health workers to verify the suspected cluster",
      "Inspect flagged water sources",
      "Prepare ORS distribution if confirmed",
    ];
  }
  if (params.priority === "P2" || params.level === "MODERATE") {
    return [
      "Increase monitoring over the next 24 hours",
      "Confirm whether affected households share a water source",
    ];
  }
  if (params.confidence < 40) {
    return ["Evidence is thin — a field check is advised before escalating further"];
  }
  return ["Continue passive surveillance and routine water-source checks"];
}