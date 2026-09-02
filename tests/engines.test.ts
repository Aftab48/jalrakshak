import { test } from "node:test";
import assert from "node:assert/strict";
import { subHours } from "date-fns";
import { computeAnomaly } from "../lib/anomaly-engine";
import { computeDiseaseSignals } from "../lib/disease-engine";
import { computeWaterRisk } from "../lib/water-risk-engine";
import { computeSpatialClusters } from "../lib/spatial-engine";
import { computeEarlyWarning } from "../lib/early-warning-engine";
import { computeRisk } from "../lib/risk-engine";
import { computePriority } from "../lib/alert-priority-engine";
import { runScenarioChecks } from "../lib/simulation-engine";

function report(partial: Partial<Parameters<typeof computeEarlyWarning>[0]["reports"][number]> = {}) {
  return {
    reportedAt: new Date(),
    symptoms: ["diarrhoea", "vomiting"],
    phoneHash: "phone-1",
    latitude: 22.56,
    longitude: 88.28,
    source: "WHATSAPP",
    ...partial,
  };
}

const baseEarly = {
  locationName: "Test",
  vulnerabilityIndex: 0.35,
  reports: [report()],
  rainfall: [],
  waterObservations: [],
  waterSources: [],
};

test("anomaly: quiet baseline stays NORMAL/WATCH", () => {
  const historical = Array.from({ length: 14 }, () => 2);
  const anomaly = computeAnomaly({ historicalCounts: historical, currentCount: 2 });
  assert.ok(["NORMAL", "WATCH"].includes(anomaly.level));
});

test("anomaly: a spike is flagged well above baseline", () => {
  const historical = Array.from({ length: 14 }, () => 2);
  const anomaly = computeAnomaly({ historicalCounts: historical, currentCount: 12 });
  assert.equal(anomaly.level, "STRONG_ANOMALY");
  assert.ok(anomaly.ratioToBaseline >= 3);
});

test("disease: acute pattern is detected from classic symptoms", () => {
  const disease = computeDiseaseSignals({
    symptoms: ["diarrhoea", "vomiting", "dehydration"],
    onsetDays: 1,
  });
  assert.equal(disease.dominant?.syndrome, "acute_diarrheal");
});

test("disease: unrelated symptoms do not force a syndrome", () => {
  const disease = computeDiseaseSignals({ symptoms: ["body_ache", "fatigue"] });
  assert.ok(disease.dominant === null || disease.dominant.percent < 40);
});

test("water: contaminated observation raises risk and lists reasons", () => {
  const water = computeWaterRisk({
    observations: [
      {
        observedAt: new Date(),
        turbidityNTU: 12,
        freeChlorine: 0.05,
        ecoliDetected: true,
        inspectionScore: 30,
      },
    ],
    rainfallMm72h: 80,
    sourceStatus: "CONTAMINATED",
  });
  assert.ok(water.waterRisk >= 70);
  assert.ok(water.reasons.length > 0);
});

test("water: missing evidence surfaces instead of fabricating risk", () => {
  const water = computeWaterRisk({
    observations: [],
    rainfallMm72h: 0,
    sourceStatus: "NORMAL",
  });
  assert.ok(water.waterRisk < 35);
});

test("spatial: co-located reports cluster, scattered reports do not", () => {
  const clustered = computeSpatialClusters({
    reports: [report({ phoneHash: "a" }), report({ phoneHash: "b" }), report({ phoneHash: "c" }), report({ phoneHash: "d" })],
  });
  assert.ok(clustered.strongest !== null);

  const scattered = computeSpatialClusters({
    reports: [
      report({ phoneHash: "a", latitude: 22.5, longitude: 88.2 }),
      report({ phoneHash: "b", latitude: 22.6, longitude: 88.3 }),
      report({ phoneHash: "c", latitude: 22.65, longitude: 88.35 }),
      report({ phoneHash: "d", latitude: 22.7, longitude: 88.4 }),
    ],
  });
  assert.equal(scattered.strongest, null);
});

test("confidence: duplicate floods depress confidence vs genuine variety", () => {
  const now = new Date();
  const genuine = computeEarlyWarning({
    ...baseEarly,
    reports: Array.from({ length: 14 }, (_, index) =>
      report({ phoneHash: `gen-${index % 10}`, reportedAt: subHours(now, 1 + index) }),
    ),
  });
  const flooded = computeEarlyWarning({
    ...baseEarly,
    reports: Array.from({ length: 40 }, (_, index) =>
      report({ phoneHash: `dup-${index % 2}`, reportedAt: subHours(now, 1 + index) }),
    ),
  });
  assert.ok(flooded.confidence.confidence < genuine.confidence.confidence);
  assert.ok(flooded.confidence.confidence < 70);
});

test("confidence: sensor gap gives low confidence", () => {
  const now = new Date();
  const sparse = computeEarlyWarning({
    locationName: "Test",
    vulnerabilityIndex: 0.35,
    reports: [report({ phoneHash: "one", reportedAt: subHours(now, 3) })],
    rainfall: [],
    waterObservations: [],
    waterSources: [],
  });
  assert.ok(sparse.confidence.confidence < 40);
});

test("priority: critical risk with strong evidence is P0", () => {
  const priority = computePriority({ risk: 93, confidence: 93, populationExposure: 0.5, vulnerability: 0.5, growth: 0.9 });
  assert.equal(priority.priority, "P0");
});

test("priority: weak signal is P3", () => {
  const priority = computePriority({ risk: 20, confidence: 30, populationExposure: 0.05, vulnerability: 0.3, growth: 0.1 });
  assert.equal(priority.priority, "P3");
});

test("risk engine: contamination behind early-water signal", () => {
  const risk = computeRisk({
    locationName: "Test",
    population: 12000,
    households: 2800,
    vulnerabilityIndex: 0.4,
    fallbackBaseline: 2,
    reports: Array.from({ length: 12 }, () => report({ symptoms: ["diarrhoea", "vomiting"] })),
    rainfall: [
      { observedAt: subHours(new Date(), 24), rainfallMm: 30 },
      { observedAt: subHours(new Date(), 48), rainfallMm: 25 },
    ],
    waterObservations: [
      { observedAt: new Date(), turbidityNTU: 10, freeChlorine: 0.1, ecoliDetected: true, inspectionScore: 35 },
    ],
    waterSources: [{ id: "s1", status: "CONTAMINATED" }],
  });
  assert.ok(risk.warningLevel === "EARLY_WARNING" || risk.warningLevel === "OUTBREAK");
  assert.ok(risk.factors.water >= 0.6);
});

test("scenario contracts: all eight demo scenarios behave as specified", () => {
  const results = runScenarioChecks(new Date());
  const failed = results.filter((result) => !result.passed);
  if (failed.length) {
    assert.fail(
      `${failed.length} scenario(s) failed:\n${failed.map((f) => `  ${f.scenario}: expected="${f.expectation}" actual="${f.actual}"`).join("\n")}`,
    );
  }
});