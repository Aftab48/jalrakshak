export type AnomalyLevel = "NORMAL" | "WATCH" | "EARLY_WARNING" | "STRONG_ANOMALY";

export type AnomalyInput = {
  reports: { current: number; history: number[] };
  currentWindowCount: number;
  baselineDays: number;
  now?: Date;
};

export type AnomalyOutput = {
  currentDailyRate: number;
  baselineDailyRate: number;
  std: number;
  zScore: number;
  ratioToBaseline: number;
  level: AnomalyLevel;
  anomalyScore: number;
  sufficientHistory: boolean;
  reasons: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function populationStd(values: number[], meanValue: number) {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, value) => sum + (value - meanValue) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Safe z-score — flattens to a ratio-based scale when variance is near zero
 * so a doubling of a low baseline is still flagged instead of being swallowed by std=0.
 */
function safeZ(current: number, baseline: number, std: number, ratioScale: number) {
  if (std >= 0.5) return (current - baseline) / std;
  if (baseline > 0) return (current - baseline) / (baseline * ratioScale);
  return current > 0 ? 3 : 0;
}

export function computeAnomaly(input: {
  historicalCounts: number[];
  currentCount: number;
  ratioScale?: number;
}): AnomalyOutput {
  const { historicalCounts, currentCount } = input;
  const ratioScale = input.ratioScale ?? 0.5;
  const baselineDailyRate = mean(historicalCounts);
  const std = populationStd(historicalCounts, baselineDailyRate);
  const sufficientHistory = historicalCounts.length >= 7;

  const zScore = round1(safeZ(currentCount, baselineDailyRate, std, ratioScale));
  const ratioToBaseline = baselineDailyRate > 0 ? currentCount / baselineDailyRate : currentCount > 0 ? currentCount : 0;

  let level: AnomalyLevel;
  if (zScore >= 3) level = "STRONG_ANOMALY";
  else if (zScore >= 2) level = "EARLY_WARNING";
  else if (zScore >= 1) level = "WATCH";
  else level = "NORMAL";

  const anomalyScore = clamp(round1(zScore / 3), 0, 1);

  const reasons: string[] = [];
  if (currentCount > 0) {
    if (baselineDailyRate > 0 && ratioToBaseline > 1) {
      reasons.push(`${ratioToBaseline.toFixed(1)}× the recent historical baseline (${currentCount} vs ${round1(baselineDailyRate)} reports/day)`);
    } else {
      reasons.push(`${currentCount} report(s) in the current window`);
    }
    reasons.push(`z-score ${zScore >= 0 ? "+" : ""}${zScore.toFixed(2)} against the rolling baseline`);
  } else {
    reasons.push("no new reports detected in the current window");
  }
  if (!sufficientHistory) reasons.push("limited baseline history — relying on a fallback baseline");

  return {
    currentDailyRate: round1(currentCount),
    baselineDailyRate: round1(baselineDailyRate),
    std: round1(std),
    zScore,
    ratioToBaseline: round1(ratioToBaseline),
    level,
    anomalyScore,
    sufficientHistory,
    reasons,
  };
}

/**
 * Builds the rolling daily series from timestamped reports.
 * `baselineDays` buckets of the previous N*24h are used as history, and the
 * last 24h window is treated as the "current" observation.
 */
export function buildDailyCounts(
  reports: { reportedAt: Date }[],
  now: Date,
  baselineDays = 14,
  windowMs = 24 * 60 * 60 * 1000,
) {
  const currentCutoff = now.getTime() - windowMs;
  const currentCount = reports.filter((report) => report.reportedAt.getTime() >= currentCutoff).length;

  const historicalCounts: number[] = [];
  for (let index = 1; index <= baselineDays; index += 1) {
    const upper = currentCutoff - (index - 1) * windowMs;
    const lower = currentCutoff - index * windowMs;
    historicalCounts.push(
      reports.filter((report) => {
        const time = report.reportedAt.getTime();
        return time >= lower && time < upper;
      }).length,
    );
  }

  return { historicalCounts, currentCount };
}

export function computeAnomalyFromReports(
  reports: { reportedAt: Date }[],
  now: Date,
  baselineDays = 14,
): AnomalyOutput {
  const { historicalCounts, currentCount } = buildDailyCounts(reports, now, baselineDays);
  return computeAnomaly({ historicalCounts, currentCount });
}