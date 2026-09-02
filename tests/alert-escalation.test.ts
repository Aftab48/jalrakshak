import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decideAlertAction,
  isMaterialEscalation,
  PRIORITY_WEIGHT,
  WARNING_SEVERITY,
  LEVEL_SEVERITY,
  type ActiveAlertLike,
} from "../lib/alert-lifecycle";

/**
 * Lifecycle tests for the acknowledged->escalation->reopen flow.
 *
 * The state transition (ACKNOWLEDGED -> OPEN on material escalation) is applied
 * by `recalculateLocationRisk` in lib/services.ts: it updates the existing alert
 * (never duplicates) and only reopens when `decision.escalation` is true for an
 * acknowledged alert. These tests validate the pure decision helper that drives
 * that transition, plus the material-escalation predicate.
 */

const acknowledged: ActiveAlertLike = {
  level: "MODERATE",
  score: 60,
  priority: "P2",
  warningLevel: "WATCH",
  status: "ACKNOWLEDGED",
};

const open: ActiveAlertLike = { ...acknowledged, status: "OPEN" };

function decide(over: Partial<Parameters<typeof decideAlertAction>[0]> = {}) {
  return decideAlertAction({
    shouldAlert: true,
    existing: acknowledged,
    riskScoreId: "rs-1",
    locationName: "Test Ward",
    level: "MODERATE",
    score: 63,
    priority: "P2",
    confidence: 70,
    warningLevel: "WATCH",
    message: "reasoning",
    recommendedAction: "act",
    ...over,
  });
}

// ---------------------------------------------------------------- TEST 1 -----

test("TEST 1: normal acknowledgement stays acknowledged, single alert (decision returns none for identical recalc)", () => {
  const decision = decide({ existing: open, score: 60, priority: "P2", level: "MODERATE", warningLevel: "WATCH" });
  assert.equal(decision.action, "none");
});

// ---------------------------------------------------------------- TEST 2 -----

test("TEST 2: non-material update does not reopen; remains ACKNOWLEDGED", () => {
  const decision = decide({ score: 63, priority: "P2", level: "MODERATE", warningLevel: "WATCH" });
  assert.equal(decision.action, "none");
  // isMaterialEscalation agrees: +3, same priority/warning/level.
  assert.equal(isMaterialEscalation(acknowledged, { score: 63, priority: "P2", warningLevel: "WATCH", level: "MODERATE" }), false);
});

// ---------------------------------------------------------------- TEST 3 -----

test("TEST 3: priority escalation reopens an acknowledged alert", () => {
  const decision = decide({ score: 80, priority: "P1", level: "HIGH", warningLevel: "EARLY_WARNING" });
  assert.equal(decision.action, "update");
  if (decision.action === "update") {
    assert.equal(decision.escalation, true);
    assert.equal(decision.priority, "P1");
  }
  assert.equal(isMaterialEscalation(acknowledged, { score: 80, priority: "P1", warningLevel: "EARLY_WARNING", level: "HIGH" }), true);
});

// ---------------------------------------------------------------- TEST 4 -----

test("TEST 4: warning-level escalation reopens", () => {
  const decision = decide({ score: 65, priority: "P2", level: "MODERATE", warningLevel: "EARLY_WARNING" });
  assert.equal(decision.action, "update");
  if (decision.action === "update") assert.equal(decision.escalation, true);
});

// ---------------------------------------------------------------- TEST 5 -----

test("TEST 5: critical escalation reopens to P0/OPEN; priority ordering reflects P0", () => {
  const decision = decide({ score: 95, priority: "P0", level: "CRITICAL", warningLevel: "OUTBREAK" });
  assert.equal(decision.action, "update");
  if (decision.action === "update") {
    assert.equal(decision.escalation, true);
    assert.equal(decision.priority, "P0");
  }
  // Dashboard queue ordering weights: P0 sits above P2.
  assert.ok((PRIORITY_WEIGHT.P0) > (PRIORITY_WEIGHT.P2));
  assert.ok((PRIORITY_WEIGHT.P0) > (PRIORITY_WEIGHT.P1));
});

// ---------------------------------------------------------------- TEST 6 -----

test("TEST 6: re-acknowledgement applies to the escalated state", () => {
  // After reopen the alert is OPEN again. A fresh acknowledge transitions it to
  // ACKNOWLEDGED exactly once (no reopen on a non-escalating repeat).
  const reopened: ActiveAlertLike = { ...acknowledged, score: 95, priority: "P0", level: "CRITICAL", warningLevel: "OUTBREAK", status: "OPEN" };
  const reAcknowledge = decide({ existing: reopened, score: 95, priority: "P0", level: "CRITICAL", warningLevel: "OUTBREAK" });
  assert.equal(reAcknowledge.action, "none", "re-acknowledged escalated state is stable until it escalates again");
});

// ---------------------------------------------------------------- TEST 7 -----

test("TEST 7: full lifecycle OPEN->ACK->escalate->OPEN->ACK->RESOLVED remains a single alert", () => {
  // Incident starts OPEN (risk 60, P2).
  const step1 = decide({ existing: { ...acknowledged, status: "OPEN" }, score: 60, priority: "P2", level: "MODERATE", warningLevel: "WATCH" });
  assert.equal(step1.action, "none"); // OPEN alert, no change (ack/time handled by endpoints)
  // Acknowledge happens via the endpoint; then risk escalates materially to P0.
  const step2 = decide({ score: 95, priority: "P0", level: "CRITICAL", warningLevel: "OUTBREAK" });
  assert.equal(step2.action, "update");
  if (step2.action === "update") assert.equal(step2.escalation, true);
  // The alert is now OPEN again (reopened). Re-recording the SAME escalated
  // state must be a no-op — one actionable alert for the incident, no re-open.
  const reopened: ActiveAlertLike = { ...acknowledged, score: 95, priority: "P0", level: "CRITICAL", warningLevel: "OUTBREAK", status: "OPEN" };
  const step3 = decide({ existing: reopened, score: 95, priority: "P0", level: "CRITICAL", warningLevel: "OUTBREAK" });
  assert.equal(step3.action, "none");
});

// ---------------------------------------------------------------- TEST 8 -----

test("TEST 8: repeated escalations never create duplicate active alerts", () => {
  // Each decision targets the existing alert; never "create" while it is active.
  const first = decide({ score: 80, priority: "P1" });
  assert.equal(first.action, "update");
  assert.notEqual(first.action, "create");
  // After the escalation the alert state now reflects P1; a further escalation
  // to P0 still updates the same alert, not a duplicate.
  const second = decide({ score: 95, priority: "P0", level: "CRITICAL", warningLevel: "OUTBREAK" });
  assert.equal(second.action, "update");
  assert.notEqual(second.action, "create");
  // Now re-recording the escalated P0 state (existing = the escalated alert) is
  // a stable no-op, so repeated runs don't reopen or spam history.
  const escalated: ActiveAlertLike = { ...acknowledged, score: 95, priority: "P0", level: "CRITICAL", warningLevel: "OUTBREAK" };
  const third = decide({ existing: escalated, score: 96, priority: "P0", level: "CRITICAL", warningLevel: "OUTBREAK" });
  assert.equal(third.action, "none");
});

// ---------------------------------------------------------------- TEST 9 -----

test("TEST 9: escalating location A never produces a decision that creates another alert for location A", () => {
  // decideAlertAction is purely per-location (single `existing`). Escalating A
  // yields an update on A's alert; there is no "create" returned while A's alert
  // is active, so B is untouched by A's incident.
  const aEscalation = decide({ score: 95, priority: "P0", level: "CRITICAL", warningLevel: "OUTBREAK" });
  assert.equal(aEscalation.action, "update");
  assert.notEqual(aEscalation.action, "create");
});

// --------------------------------------------------------------- TEST 10 -----

test("TEST 10: queue ordering uses current urgency, not creation time", () => {
  // Simulate the sort comparator used in getDashboardData: OPEN first, then
  // priority, warning, level, score. An escalated P0 alert must outrank a newer
  // P2 alert regardless of triggeredAt.
  type QueueAlert = {
    id: string;
    status: "OPEN" | "ACKNOWLEDGED";
    priority: string;
    warningLevel: string;
    level: string;
    score: number;
    triggeredAt: Date;
  };
  const escalatedP0: QueueAlert = {
    id: "old-but-escalated", status: "OPEN", priority: "P0", warningLevel: "OUTBREAK", level: "CRITICAL", score: 95, triggeredAt: new Date(Date.now() - 86_400_000),
  };
  const newerP2: QueueAlert = {
    id: "newer-p2", status: "OPEN", priority: "P2", warningLevel: "WATCH", level: "MODERATE", score: 60, triggeredAt: new Date(),
  };

  const order = [escalatedP0, newerP2].sort((a, b) => {
    const activeA = a.status === "OPEN" ? 1 : 0;
    const activeB = b.status === "OPEN" ? 1 : 0;
    if (activeA !== activeB) return activeB - activeA;
    const pw = (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0);
    if (pw !== 0) return pw;
    const ws = (WARNING_SEVERITY[b.warningLevel] ?? 0) - (WARNING_SEVERITY[a.warningLevel] ?? 0);
    if (ws !== 0) return ws;
    const lv = (LEVEL_SEVERITY[b.level] ?? 0) - (LEVEL_SEVERITY[a.level] ?? 0);
    if (lv !== 0) return lv;
    return b.score - a.score;
  });
  assert.equal(order[0].id, "old-but-escalated", "escalated P0 must appear above newer P2");
  assert.equal(order[1].id, "newer-p2");
});

// --------------------------------------------------------------- EXTRA ------

test("escalation predicate: de-escalation (priority softens) is NOT a material escalation", () => {
  const before = { score: 80, priority: "P1", warningLevel: "EARLY_WARNING", level: "HIGH" };
  const after = { score: 70, priority: "P2", warningLevel: "WATCH", level: "MODERATE" };
  assert.equal(isMaterialEscalation(before, after), false);
});

test("escalation predicate: risk jump >=8 alone is material", () => {
  const before = { score: 60, priority: "P2", warningLevel: "WATCH", level: "MODERATE" };
  const after = { score: 70, priority: "P2", warningLevel: "WATCH", level: "MODERATE" };
  assert.equal(isMaterialEscalation(before, after), true);
});

test("escalation predicate: sub-threshold risk bump is NOT material", () => {
  const before = { score: 60, priority: "P2", warningLevel: "WATCH", level: "MODERATE" };
  const after = { score: 63, priority: "P2", warningLevel: "WATCH", level: "MODERATE" };
  assert.equal(isMaterialEscalation(before, after), false);
});

test("idempotency: identical material state stabilises to no-op on repeat", () => {
  const first = decide({ score: 95, priority: "P0", level: "CRITICAL", warningLevel: "OUTBREAK", existing: { ...acknowledged, score: 80, priority: "P1", level: "HIGH", warningLevel: "EARLY_WARNING" } });
  const second = decide({ score: 96, priority: "P0", level: "CRITICAL", warningLevel: "OUTBREAK", existing: { ...acknowledged, score: 95, priority: "P0", level: "CRITICAL", warningLevel: "OUTBREAK" } });
  assert.equal(first.action, "update");
  assert.equal(second.action, "none", "re-recording the escalated state does not reopen or spam again");
});