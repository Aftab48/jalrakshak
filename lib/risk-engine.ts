import { differenceInHours, subHours } from "date-fns";

type SymptomReport = {
  reportedAt: Date;
  onsetAt: Date;
  severity: number;
  symptoms: string[];
  phoneHash?: string | null;
  waterSourceId?: string | null;
};

type RainfallObservation = {
  observedAt: Date;
  rainfallMm: number;
};

type WaterSource = {
  id: string;
  status: "NORMAL" | "WATCH" | "SUSPECTED" | "CONTAMINATED";
};

export type RiskInput = {
  locationName: string;
  population: number;
  baselineDailyCases: number;
  vulnerabilityIndex: number;
  reports: SymptomReport[];
  rainfall: RainfallObservation[];
  waterSources: WaterSource[];
  now?: Date;
};

export type RiskOutput = {
  score: number;
  level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  factors: {
    symptomCluster: number;
    growthRate: number;
    rainfall: number;
    waterSource: number;
    recency: number;
    confidence: number;
    reportCount72h: number;
    uniqueReporterCount72h: number;
  };
  reasoning: string;
  recommendedAction: string;
};

const statusWeight = {
  NORMAL: 0,
  WATCH: 8,
  SUSPECTED: 17,
  CONTAMINATED: 25,
};

export function computeRisk(input: RiskInput): RiskOutput {
  const now = input.now ?? new Date();
  const reports72h = input.reports.filter((report) => report.reportedAt >= subHours(now, 72));
  const reports24h = input.reports.filter((report) => report.reportedAt >= subHours(now, 24));
  const reportsPrev48h = input.reports.filter(
    (report) => report.reportedAt < subHours(now, 24) && report.reportedAt >= subHours(now, 72),
  );
  const uniqueReporters = new Set(reports72h.map((report) => report.phoneHash).filter(Boolean));

  const expectedCases = Math.max(1, input.baselineDailyCases * 3);
  const clusterPressure = Math.min(28, (reports72h.length / expectedCases) * 12);
  const symptomSeverity = average(reports72h.map((report) => report.severity)) * 2.2;
  const symptomCluster = Math.min(35, clusterPressure + symptomSeverity);

  const previousDailyRate = reportsPrev48h.length / 2;
  const growthRate =
    previousDailyRate === 0
      ? reports24h.length >= 4
        ? 18
        : reports24h.length * 2
      : Math.min(22, Math.max(0, ((reports24h.length - previousDailyRate) / previousDailyRate) * 12));

  const rainfall72h = input.rainfall
    .filter((item) => item.observedAt >= subHours(now, 72))
    .reduce((sum, item) => sum + item.rainfallMm, 0);
  const rainfallScore = Math.min(18, rainfall72h / 5);

  const worstWaterSource = input.waterSources.reduce(
    (max, source) => Math.max(max, statusWeight[source.status]),
    0,
  );
  const suspectSourceReports = reports72h.filter((report) => {
    const source = input.waterSources.find((item) => item.id === report.waterSourceId);
    return source && source.status !== "NORMAL";
  }).length;
  const waterSource = Math.min(25, worstWaterSource + suspectSourceReports * 2);

  const newestReport = reports72h.toSorted((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime())[0];
  const hoursSinceNewest = newestReport ? differenceInHours(now, newestReport.reportedAt) : 99;
  const recency = Math.max(0, 10 - hoursSinceNewest * 1.4);
  const vulnerability = input.vulnerabilityIndex * 10;
  const duplicatePenalty = reports72h.length > 0 && uniqueReporters.size <= 2 ? 8 : 0;

  const rawScore =
    symptomCluster +
    growthRate +
    rainfallScore +
    waterSource +
    recency +
    vulnerability -
    duplicatePenalty;
  const score = clamp(Math.round(rawScore), 0, 100);
  const level = score >= 75 ? "CRITICAL" : score >= 55 ? "HIGH" : score >= 32 ? "MODERATE" : "LOW";
  const confidence = confidenceScore(reports72h.length, uniqueReporters.size, input.rainfall.length);

  const reasons = [
    `${reports72h.length} symptom reports in 72h`,
    `${reports24h.length} in the last 24h`,
    `${rainfall72h.toFixed(1)}mm rainfall over 72h`,
    waterSource >= 17 ? "one or more flagged water sources" : "no confirmed water-source contamination",
  ];

  if (duplicatePenalty > 0) reasons.push("duplicate pressure reduced because reports came from very few phones");

  return {
    score,
    level,
    factors: {
      symptomCluster: round1(symptomCluster),
      growthRate: round1(growthRate),
      rainfall: round1(rainfallScore),
      waterSource: round1(waterSource),
      recency: round1(recency),
      confidence,
      reportCount72h: reports72h.length,
      uniqueReporterCount72h: uniqueReporters.size,
    },
    reasoning: `${input.locationName}: ${level.toLowerCase()} risk because ${reasons.join(", ")}.`,
    recommendedAction: actionFor(level),
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function confidenceScore(reportCount: number, uniqueReporterCount: number, rainfallCount: number) {
  const reportConfidence = Math.min(55, reportCount * 5);
  const reporterConfidence = Math.min(25, uniqueReporterCount * 4);
  const dataConfidence = rainfallCount > 0 ? 20 : 8;
  return clamp(reportConfidence + reporterConfidence + dataConfidence, 15, 100);
}

function actionFor(level: RiskOutput["level"]) {
  if (level === "CRITICAL") {
    return "Dispatch PHC verification, test shared water points, send ORS and boil-water advisory immediately.";
  }
  if (level === "HIGH") {
    return "Ask ASHA workers to verify clusters, inspect flagged water sources, and prepare ORS distribution.";
  }
  if (level === "MODERATE") {
    return "Increase monitoring for 24 hours and confirm whether cases share a water source.";
  }
  return "Continue passive surveillance and routine water-source checks.";
}
