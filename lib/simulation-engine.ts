import { subDays, subHours, subMinutes } from "date-fns";
import { computeRisk, type RiskInput, type RiskOutput } from "./risk-engine";
import {
  DEFAULT_WHAT_IF,
  SCENARIOS,
  SCENARIO_PRESETS,
  SCENARIO_IDS,
  type WhatIfAdjustments,
  type ScenarioId,
} from "./simulation-presets";

export { DEFAULT_WHAT_IF, SCENARIOS, SCENARIO_PRESETS, SCENARIO_IDS };
export type { ScenarioId, ScenarioMeta } from "./simulation-presets";

export type WhatIfBase = {
  locationName: string;
  population: number;
  households: number;
  baselineDailyCases: number;
  vulnerabilityIndex: number;
  now?: Date;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mulberry32(seed: number) {
  let state = seed | 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Runs the ACTUAL risk engine on synthetic inputs built from the slider values.
 * Nothing about the numbers is animated or faked — the what-if UI is a control
 * surface for the real intelligence pipeline.
 *
 * Uses a deterministic seed (SIMULATION_SEED, default 1) so what-if projections
 * and the demo scenario checks are reproducible; the day of year is folded in so
 * results still vary across days without becoming jittery.
 */
export function simulateWhatIf(base: WhatIfBase, adjustments: WhatIfAdjustments): RiskOutput {
  const now = base.now ?? new Date();
  const seed = Number(process.env.SIMULATION_SEED ?? 1);
  const dayBucket = Math.floor(now.getTime() / 86_400_000);
  const rand = mulberry32((seed * 2654435761 + dayBucket * 7) | 0);
  const jitterAt = (center: number, spread: number) => center + (rand() - 0.5) * spread;

  const baseline = Math.max(0.2, base.baselineDailyCases);
  const currentCount = Math.max(0, Math.round(baseline * Math.max(0, adjustments.symptomIncrease)));
  const historyScale = adjustments.historyScale ?? 1;
  const historyDays = 14;
  const historyCounts = Array.from({ length: historyDays }).map((_, index) => {
    const seasonal = (1 + (index < 5 ? 0.25 : index < 10 ? 0.1 : 0.15)) * historyScale;
    return Math.max(0, Math.round(baseline * seasonal + (rand() - 0.5) * baseline * 0.8));
  });

  const reports: RiskInput["reports"] = [];
  const historySources = ["HEALTH_WORKER", "WHATSAPP"];
  historyCounts.forEach((count, dayIndex) => {
    for (let index = 0; index < count; index += 1) {
      reports.push({
        reportedAt: subDays(now, dayIndex + 2),
        symptoms: ["diarrhoea", "vomiting"],
        phoneHash: `seed-${dayIndex}`,
        latitude: jitterAt(0, 0.012),
        longitude: jitterAt(0, 0.012),
        source: historySources[dayIndex % historySources.length],
      });
    }
  });
  const clusterPoints = Math.round(clamp(adjustments.spatialStrength * 12, 0, 12));
  const uniquePhones = Math.max(1, Math.min(currentCount, adjustments.uniquePhones ?? currentCount));
  const todaySources = ["WHATSAPP", "DASHBOARD", "IVR"];

  // growthRate shapes the *trajectory* of the current report block rather than
  // adding directly to the score. A high growth concentrates reports into the
  // last 24h (recent window dominates the prior 25–72h window), so the engine's
  // computed growth signal — and from there risk → warning → priority — rises.
  // A low growth spreads reports across the 25–72h window, dampening growth.
  // Total recent volume (symptomIncrease) is preserved so disease/anomaly/
  // confidence still respond to the slider.
  const growth = clamp(adjustments.growthRate, 0, 1);
  const growthBaselineFraction = 0.15; // even at growth=0 spread a little into the last 24h
  const recent24hCount = Math.round(currentCount * (growthBaselineFraction + (1 - growthBaselineFraction) * growth));
  for (let index = 0; index < currentCount; index += 1) {
    const clustered = index < clusterPoints;
    // Recent-24h reports get nearby timestamps; the remainder fill the previous
    // 25–72h window so the prior rate rises as growth falls.
    const reportedAt =
      index < recent24hCount
        ? subHours(now, 1 + index * (20 / Math.max(1, recent24hCount)))
        : subHours(now, 25 + (index - recent24hCount) * (44 / Math.max(1, currentCount - recent24hCount)));
    reports.push({
      reportedAt,
      symptoms: ["diarrhoea", "vomiting", "dehydration", "stomach_pain"],
      phoneHash: `today-${index % Math.max(1, uniquePhones)}`,
      latitude: clustered ? jitterAt(0, 0.0018) : jitterAt(0.004, 0.02),
      longitude: clustered ? jitterAt(0, 0.0018) : jitterAt(0.004, 0.02),
      source: todaySources[index % todaySources.length],
    });
  }

  const rainfall: RiskInput["rainfall"] = adjustments.noRainfallEvidence
    ? []
    : [1, 2, 3].map((day) => ({
        observedAt: subDays(now, day),
        rainfallMm: adjustments.rainfallMm72h / 3,
      }));

  const contamination = clamp(adjustments.waterContamination, 0, 1);
  const waterObservations: RiskInput["waterObservations"] = adjustments.noWaterEvidence
    ? []
    : [
        {
          observedAt: subMinutes(now, 30),
          turbidityNTU: contamination > 0.5 ? clamp(contamination * 12, 0, 16) : clamp(contamination * 8, 0, 6),
          freeChlorine: contamination > 0.5 ? clamp(0.55 - contamination * 0.7, 0, 0.4) : 0.9,
          ecoliDetected: adjustments.ecoliPositive || contamination > 0.75,
          inspectionScore: Math.round(100 - contamination * 80),
          ph: 7.1,
          tds: 120 + contamination * 500,
          sampleMethod: "SIMULATION",
          confidence: 0.7,
        },
      ];

  const waterSources: RiskInput["waterSources"] = [
    {
      id: "sim-water",
      status: contamination >= 0.6 ? "CONTAMINATED" : contamination >= 0.35 ? "SUSPECTED" : "NORMAL",
    },
  ];

  return computeRisk({
    locationName: base.locationName,
    population: base.population,
    households: base.households,
    vulnerabilityIndex: clamp(adjustments.populationVulnerability, 0, 1),
    fallbackBaseline: baseline,
    reports,
    rainfall,
    waterObservations,
    waterSources,
    now,
  });
}

/**
 * Validates the demo contract for each scenario against the real engine.
 * Returns { scenario, expectation, actual, passed } tuples for reporting/tests.
 */
export function runScenarioChecks(now = new Date()): Array<{ scenario: ScenarioId; expectation: string; actual: string; passed: boolean }> {
  const checks: Array<{ scenario: ScenarioId; expectation: string; actual: string; passed: boolean }> = [];
  const base: WhatIfBase = {
    locationName: "Simulation Village",
    population: 12860,
    households: 2810,
    baselineDailyCases: 1.9,
    vulnerabilityIndex: 0.35,
    now,
  };

  const add = (scenario: ScenarioId, expectation: (risk: RiskOutput) => boolean, description: string) => {
    const risk = simulateWhatIf(base, SCENARIO_PRESETS[scenario]);
    checks.push({
      scenario,
      expectation: description,
      actual: `${risk.warningLevel} / ${risk.level} / risk ${risk.score} / confidence ${risk.confidence} / ${risk.priority}`,
      passed: expectation(risk),
    });
  };

  add("TRUE_OUTBREAK", (r) => r.warningLevel === "OUTBREAK" && (r.level === "HIGH" || r.level === "CRITICAL"), "OUTBREAK warning with high/critical risk");
  add("HEAVY_RAIN_ONLY", (r) => r.warningLevel !== "OUTBREAK" && r.warningLevel !== "EARLY_WARNING" && r.level !== "CRITICAL", "must NOT trigger outbreak on rain alone");
  add("WATER_CONTAMINATION_ONLY", (r) => r.warningLevel === "EARLY_WARNING" || r.warningLevel === "OUTBREAK", "early warning driven by water risk");
  add("SEASONAL_INCREASE", (r) => r.warningLevel !== "OUTBREAK" && r.warningLevel !== "EARLY_WARNING", "rolling baseline absorbs seasonality");
  add("DUPLICATE_REPORT_ATTACK", (r) => r.confidence < 70 && r.priority !== "P0", "confidence drops under duplicate pressure, no P0");
  add("SENSOR_DATA_FAILURE", (r) => r.confidence < 50, "low confidence when evidence is missing");
  add("HIDDEN_OUTBREAK", (r) => r.warningLevel === "EARLY_WARNING" || r.warningLevel === "WATCH", "early warning through indirect signals");
  add("MULTIPLE_HOTSPOTS", (r) => r.factors.spatial >= 0.5 && r.score >= 40, "multiple spatial clusters raise risk");

  return checks;
}