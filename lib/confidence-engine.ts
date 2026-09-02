export type ConfidenceInput = {
  reportCount72h: number;
  uniqueReporterCount: number;
  sourceCount: number;
  hasRainfall: boolean;
  hasWaterObservations: boolean;
  hasSpatialCluster: boolean;
  duplicateUncertainty: number;
  waterObservationFresh?: number;
};

export type ConfidenceBreakdown = {
  reportCoverage: number;
  uniqueReporters: number;
  sourceDiversity: number;
  environmentalData: number;
  waterData: number;
  spatialConsistency: number;
  duplicatePenalty: number;
};

export type ConfidenceOutput = {
  confidence: number;
  breakdown: ConfidenceBreakdown;
  reasons: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Confidence measures the quality and completeness of the *evidence* behind an
 * assessment. It is intentionally separate from risk: high risk can come with
 * low confidence (a signal we do not trust yet) and vice versa.
 *
 * Duplicate-heavy volume is discounted by using an "effective" report count
 * (volume × uniqueness). Thin, single-reporter floods therefore never buy
 * confidence — which is exactly the defense a duplicate-report attack needs.
 */
export function computeConfidence(input: ConfidenceInput): ConfidenceOutput {
  const uniqueness = input.reportCount72h > 0 ? input.uniqueReporterCount / input.reportCount72h : 0;
  const effectiveCount = input.reportCount72h * uniqueness;

  const breakdown: ConfidenceBreakdown = {
    reportCoverage: clamp(Math.round(effectiveCount * 4), 0, 22),
    uniqueReporters: clamp(Math.round(input.uniqueReporterCount * 4), 0, 33),
    sourceDiversity: clamp(Math.round(input.sourceCount * 5), 0, 10),
    environmentalData: input.hasRainfall ? 10 : 5,
    waterData: input.hasWaterObservations ? Math.min(10, 6 + (input.waterObservationFresh ?? 0) * 2) : 5,
    spatialConsistency: input.hasSpatialCluster ? 10 : 5,
    duplicatePenalty: clamp(Math.round(Math.max(0, 1 - uniqueness) * 30), 0, 30),
  };

  const raw =
    breakdown.reportCoverage +
    breakdown.uniqueReporters +
    breakdown.sourceDiversity +
    breakdown.environmentalData +
    breakdown.waterData +
    breakdown.spatialConsistency -
    breakdown.duplicatePenalty;

  const confidence = clamp(Math.round(raw), 5, 100);

  const reasons: string[] = [];
  if (input.reportCount72h < 3) reasons.push("few reports in the window");
  if (uniqueness < 0.5 && input.reportCount72h >= 5)
    reasons.push("high report volume but very low reporter diversity — possible duplicates");
  if (!input.hasRainfall) reasons.push("rainfall/environmental data not available");
  if (!input.hasWaterObservations) reasons.push("no water-quality observations to corroborate");
  if (input.hasSpatialCluster) reasons.push("spatially consistent signal");
  if (input.uniqueReporterCount <= 1 && input.reportCount72h > 0)
    reasons.push("reports come from a single reporter — duplicates cannot be ruled out");
  if (confidence < 40) reasons.push("evidence is thin — field verification strongly advised");
  if (confidence >= 80) reasons.push("multi-source evidence supports this assessment");

  return { confidence, breakdown, reasons };
}