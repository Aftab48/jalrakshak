import { test } from "node:test";
import assert from "node:assert/strict";
import { simulateWhatIf, type WhatIfBase } from "../lib/simulation-engine";
import { decideAlertAction, type ActiveAlertLike } from "../lib/alert-lifecycle";
import { buildScenarioCleanupFilters } from "../lib/scenario-cleanup";

process.env.SIMULATION_SEED = "1";

const base: WhatIfBase = {
  locationName: "Growth Test",
  population: 12000,
  households: 2800,
  baselineDailyCases: 2,
  vulnerabilityIndex: 0.35,
};

function whatIf(growthRate: number) {
  return simulateWhatIf(base, {
    rainfallMm72h: 5,
    symptomIncrease: 4,
    growthRate,
    waterContamination: 0,
    populationVulnerability: 0.35,
    spatialStrength: 0,
    ecoliPositive: false,
    uniquePhones: 8,
  });
}

// ---------------------------------------------------------------- Issue 2 --

test("growth: low growth produces low growth signal and low output", () => {
  const risk = whatIf(0.1);
  assert.ok(risk.factors.growth < 0.2);
  assert.ok(risk.score < 50);
});

test("growth: high growth produces a materially higher growth signal and output", () => {
  const risk = whatIf(1);
  assert.ok(risk.factors.growth > 0.5);
  assert.ok(risk.score > whatIf(0.1).score + 10);
});

test("growth: medium growth sits between low and high", () => {
  const low = whatIf(0.1);
  const medium = whatIf(0.5);
  const high = whatIf(1);
  assert.ok(medium.factors.growth >= low.factors.growth);
  assert.ok(high.factors.growth >= medium.factors.growth);
  // Producing a warning escalation purely from the growth slider proves the
  // reported trajectory (recent24h vs prior window) is what changed.
  assert.notEqual(low.warningLevel, high.warningLevel);
});

test("growth: changing ONLY growthRate changes the simulation output", () => {
  const low = whatIf(0.1);
  const high = whatIf(1);
  assert.notEqual(low.score, high.score);
  assert.notEqual(low.rawMetrics.reportCount24h, high.rawMetrics.reportCount24h);
  assert.notEqual(low.factors.growth, high.factors.growth);
});

// ---------------------------------------------------------------- Issue 1 --

test("cleanup scope: symptom filter is scoped to the target location", () => {
  const filters = buildScenarioCleanupFilters("loc-A", ["ws-1", "ws-2"]);
  assert.equal(filters.symptomReports.locationId, "loc-A");
  assert.equal(filters.symptomReports.source, "SIMULATION");
  assert.deepEqual((filters.symptomReports.notes as { contains: string }).contains, "scenario:simulation");
});

test("cleanup scope: water observation filter only covers the location's own sources", () => {
  const filters = buildScenarioCleanupFilters("loc-A", ["ws-1", "ws-2"]);
  assert.deepEqual(filters.waterObservations.waterSourceId, { in: ["ws-1", "ws-2"] });
  assert.equal(filters.waterObservations.sampleMethod, "SIMULATION");
});

test("cleanup scope: rainfall filter is scoped to the target location and marker", () => {
  const filters = buildScenarioCleanupFilters("loc-A", ["ws-1"]);
  assert.equal(filters.rainfallObservations.locationId, "loc-A");
  assert.equal(filters.rainfallObservations.source, "synthetic-scenario");
});

test("cleanup scope: different locations keep their own scenario data in the filter", () => {
  const a = buildScenarioCleanupFilters("loc-A", ["ws-A1"]);
  const b = buildScenarioCleanupFilters("loc-B", ["ws-B1"]);
  assert.notEqual(a.symptomReports.locationId, b.symptomReports.locationId);
  assert.notEqual(a.rainfallObservations.locationId, b.rainfallObservations.locationId);
  assert.notDeepEqual(a.waterObservations.waterSourceId, b.waterObservations.waterSourceId);
});

// ---------------------------------------------------------------- Issue 3 --

const baseExisting: ActiveAlertLike = {
  level: "HIGH",
  score: 72,
  priority: "P1",
  warningLevel: "EARLY_WARNING",
  status: "OPEN",
};

function decide(params: {
  shouldAlert?: boolean;
  existing?: ActiveAlertLike | null;
  score?: number;
  priority?: "P0" | "P1" | "P2" | "P3";
  level?: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  warningLevel?: "NORMAL" | "WATCH" | "EARLY_WARNING" | "OUTBREAK";
}) {
  return decideAlertAction({
    shouldAlert: params.shouldAlert ?? true,
    existing: params.existing === undefined ? baseExisting : params.existing,
    riskScoreId: "rs-1",
    locationName: "Test Ward",
    level: params.level ?? "HIGH",
    score: params.score ?? 72,
    priority: params.priority ?? "P1",
    confidence: 70,
    warningLevel: params.warningLevel ?? "EARLY_WARNING",
    message: "reasoning",
    recommendedAction: "act",
  });
}

test("alert: no active alert creates a fresh alert", () => {
  assert.equal(decide({ existing: null }).action, "create");
});

test("alert: risk escalation updates the existing alert instead of duplicating", () => {
  const decision = decide({ score: 84, priority: "P0", level: "CRITICAL", warningLevel: "OUTBREAK" });
  assert.equal(decision.action, "update");
  if (decision.action === "update") {
    assert.equal(decision.score, 84);
    assert.equal(decision.priority, "P0");
    assert.equal(decision.level, "CRITICAL");
  }
});

test("alert: priority change updates the existing alert", () => {
  const decision = decide({ score: 72, priority: "P0" });
  assert.equal(decision.action, "update");
});

test("alert: level change updates the existing alert", () => {
  const decision = decide({ score: 72, level: "CRITICAL" });
  assert.equal(decision.action, "update");
});

test("alert: repeated identical recalculation does not create a duplicate", () => {
  const decision = decide({ score: 72, priority: "P1", level: "HIGH" });
  assert.equal(decision.action, "none");
});

test("alert: small non-escalating change does not create a duplicate", () => {
  const decision = decide({ score: 74, priority: "P1", level: "HIGH", warningLevel: "EARLY_WARNING" });
  assert.equal(decision.action, "none");
});

test("alert: a resolved/closed alert allows a genuinely new incident alert", () => {
  const closed: ActiveAlertLike = { ...baseExisting, status: "RESOLVED" };
  assert.equal(decide({ existing: closed }).action, "create");
  const dismissed: ActiveAlertLike = { ...baseExisting, status: "DISMISSED" };
  assert.equal(decide({ existing: dismissed }).action, "create");
});

test("alert: acknowledged alert is superseded (updated+reopened) when its risk escalates", () => {
  const acknowledged: ActiveAlertLike = { ...baseExisting, status: "ACKNOWLEDGED" };
  const decision = decide({ existing: acknowledged, score: 90, priority: "P0", level: "CRITICAL", warningLevel: "OUTBREAK" });
  assert.equal(decision.action, "update");
  if (decision.action === "update") {
    assert.equal(decision.escalation, true, "material escalation must flag reopening");
  }
});

test("alert: no alert when the risk does not warrant one", () => {
  assert.equal(decide({ shouldAlert: false, existing: null }).action, "none");
});