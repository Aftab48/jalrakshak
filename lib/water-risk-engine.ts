import type { WarningLevel } from "./early-warning-types";

export type WaterObservationInput = {
  observedAt?: Date | null;
  turbidityNTU?: number | null;
  ph?: number | null;
  tds?: number | null;
  freeChlorine?: number | null;
  ecoliDetected?: boolean | null;
  inspectionScore?: number | null;
  sampleMethod?: string | null;
  confidence?: number | null;
};

export type WaterRiskInput = {
  observations: WaterObservationInput[];
  rainfallMm72h?: number;
  sourceStatus?: "NORMAL" | "WATCH" | "SUSPECTED" | "CONTAMINATED" | null;
  now?: Date;
};

export type WaterRiskOutput = {
  waterRisk: number;
  level: WarningLevel;
  factors: {
    turbidity: number;
    chlorine: number;
    ecoli: number;
    ph: number;
    tds: number;
    rainfall: number;
    recency: number;
    inspection: number;
  };
  reasons: string[];
  missingData: boolean;
  dataPoints: number;
};

/**
 * Prototype reference thresholds (NOT water-quality standards).
 */
export const WATER_THRESHOLDS = {
  turbidityHighNTU: 5,
  chlorineLowMgL: 0.4,
  phLow: 6.5,
  phHigh: 8.5,
  tdsHigh: 500,
  tdsVeryHigh: 1000,
  maxAgeHours: 72,
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
function scaleIn(value: number, low: number, high: number) {
  // 0 at low, 1 at high (increasing risk)
  if (high <= low) return value >= high ? 1 : 0;
  return clamp((value - low) / (high - low), 0, 1);
}

export function computeWaterRisk(input: WaterRiskInput): WaterRiskOutput {
  const now = input.now ?? new Date();
  const sorted = [...input.observations].sort(
    (a, b) => (b.observedAt?.getTime() ?? 0) - (a.observedAt?.getTime() ?? 0),
  );
  const latest = sorted[0];

  const ageHours = latest?.observedAt
    ? Math.max(0, (now.getTime() - latest.observedAt.getTime()) / 3_600_000)
    : null;
  const recency = ageHours === null ? 0 : clamp(1 - ageHours / WATER_THRESHOLDS.maxAgeHours, 0, 1);

  const turbidity = latest?.turbidityNTU != null ? scaleIn(latest.turbidityNTU, 2, WATER_THRESHOLDS.turbidityHighNTU + 8) : 0;
  const chlorine =
    latest?.freeChlorine != null
      ? latest.freeChlorine < 0.2
        ? 1
        : scaleIn(WATER_THRESHOLDS.chlorineLowMgL - latest.freeChlorine, 0, WATER_THRESHOLDS.chlorineLowMgL)
      : 0;
  const ecoli = latest?.ecoliDetected ? 1 : 0;
  const ph =
    latest?.ph != null
      ? Math.max(
          scaleIn(latest.ph, WATER_THRESHOLDS.phHigh, WATER_THRESHOLDS.phHigh + 1.5),
          scaleIn(2 * WATER_THRESHOLDS.phLow - latest.ph, 0, 1.5),
        )
      : 0;
  const tds =
    latest?.tds != null
      ? Math.max(scaleIn(latest.tds, WATER_THRESHOLDS.tdsHigh, WATER_THRESHOLDS.tdsVeryHigh), 0)
      : 0;
  const inspection = latest?.inspectionScore != null ? 1 - clamp(latest.inspectionScore, 0, 100) / 100 : 0;
  const rainfall = scaleIn(input.rainfallMm72h ?? 0, 20, 150);

  const statusBonus =
    input.sourceStatus === "CONTAMINATED" ? 0.1 : input.sourceStatus === "SUSPECTED" ? 0.05 : 0;

  const qualityFactor = Math.max(ph, tds);

  let waterRisk01 =
    0.3 * turbidity +
    0.25 * ecoli +
    0.2 * chlorine +
    0.1 * qualityFactor +
    0.08 * inspection +
    0.07 * rainfall +
    statusBonus;

  // When multiple independent factors agree the risk is amplified. Prototype only.
  const highCount = [turbidity, ecoli, chlorine, ph, tds].filter((value) => value >= 0.7).length;
  if (highCount >= 3) waterRisk01 *= 1.12;
  else if (highCount === 2) waterRisk01 *= 1.04;

  // Freshness discount: stale data carries a small penalty.
  if (latest && recency === 0 && ageHours !== null) waterRisk01 *= 0.7;

  const waterRisk = Math.round(clamp(waterRisk01, 0, 1) * 100);

  const level: WarningLevel =
    waterRisk >= 70 ? "OUTBREAK" : waterRisk >= 45 ? "EARLY_WARNING" : waterRisk >= 22 ? "WATCH" : "NORMAL";

  const dataPoints = input.observations.length;
  const missingData = !latest;

  const reasons: string[] = [];
  if (!latest) {
    reasons.push("no recent water-quality observations available");
  } else {
    if (turbidity >= 0.7) reasons.push(`turbidity elevated at ${latest.turbidityNTU} NTU`);
    else if (turbidity >= 0.35) reasons.push(`turbidity moderately elevated (${latest.turbidityNTU} NTU)`);
    if (chlorine >= 0.7) reasons.push(`residual/free chlorine deficient (${latest.freeChlorine} mg/L)`);
    if (ecoli) reasons.push("E. coli detected in sample");
    if (ph >= 0.7) reasons.push(`pH outside expected range (${latest.ph})`);
    if (tds >= 0.7) reasons.push(`total dissolved solids elevated (${latest.tds} mg/L)`);
    if (inspection >= 0.7) reasons.push(`recent inspection scored only ${latest.inspectionScore}/100`);
    if (rainfall >= 0.7) reasons.push("heavy rainfall may be contaminating supply");
    if (ageHours !== null && ageHours > WATER_THRESHOLDS.maxAgeHours)
      reasons.push(`sample may be stale (${Math.round(ageHours)}h old)`);
  }

  return {
    waterRisk,
    level,
    factors: {
      turbidity: round1(turbidity),
      chlorine: round1(chlorine),
      ecoli: round1(ecoli),
      ph: round1(ph),
      tds: round1(tds),
      rainfall: round1(rainfall),
      recency: round1(recency),
      inspection: round1(inspection),
    },
    reasons: reasons.length ? reasons : ["water appears within expected ranges"],
    missingData,
    dataPoints,
  };
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}