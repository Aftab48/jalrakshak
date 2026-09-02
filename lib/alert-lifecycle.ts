import type { RiskLevel, AlertPriority, WarningLevel, AlertStatus } from "@prisma/client";
import type { AlertPriorityLabel } from "./alert-priority-engine";

/**
 * Central ordering for alert urgency. Lower numbers are less urgent; the maps
 * drive both the escalation decision (does this material escalate earlier
 * urgency?) and the dashboard queue ordering (current urgency, not mere recency).
 */
export const PRIORITY_WEIGHT: Record<string, number> = { P0: 3, P1: 2, P2: 1, P3: 0 };
export const WARNING_SEVERITY: Record<string, number> = {
  OUTBREAK: 3,
  EARLY_WARNING: 2,
  WATCH: 1,
  NORMAL: 0,
};
export const LEVEL_SEVERITY: Record<string, number> = { CRITICAL: 3, HIGH: 2, MODERATE: 1, LOW: 0 };

function weight(order: Record<string, number>, value: string, fallback = 0) {
  return order[value] ?? fallback;
}

/**
 * Decide whether new intelligence is a *material escalation* of a previously
 * known incident — meaning the current state of the alert needs renewed
 * attention and, if it was acknowledged, must be reopened.
 *
 * A material escalation is a clear worsening using the V2 ordering:
 *  - priority becomes more urgent   (P0 > P1 > P2 > P3)
 *  - warning level becomes more severe (OUTBREAK > EARLY_WARNING > WATCH > NORMAL)
 *  - risk level becomes more severe (CRITICAL > HIGH > MODERATE > LOW)
 *  - risk score rises materially (same significant-increase threshold the
 *    engine already uses for escalation)
 *
 * Trivial drift (a few points, same priority/warning) is NOT material and must
 * not reopen an acknowledged alert.
 */
export function isMaterialEscalation(previous: {
  priority: string;
  warningLevel: string;
  level: string;
  score: number;
}, next: {
  priority: string;
  warningLevel: string;
  level: string;
  score: number;
}, escalationThreshold = 8): boolean {
  const priorityWorsened = weight(PRIORITY_WEIGHT, next.priority) > weight(PRIORITY_WEIGHT, previous.priority);
  const warningWorsened = weight(WARNING_SEVERITY, next.warningLevel) > weight(WARNING_SEVERITY, previous.warningLevel);
  const levelWorsened = weight(LEVEL_SEVERITY, next.level) > weight(LEVEL_SEVERITY, previous.level);
  const bigRiskJump = next.score - previous.score >= escalationThreshold;
  return priorityWorsened || warningWorsened || levelWorsened || bigRiskJump;
}

/**
 * Pure decision logic for the alert queue, kept separate from any database
 * access so it can be unit-tested independently.
 *
 * Design: keep a single active (OPEN/ACKNOWLEDGED) alert per location. Repeated
 * recomputation of the same incident updates that alert (risk, level, priority,
 * warning, reasoning, message, recommended action) rather than creating a
 * second active queue entry. A genuinely new incident — no active alert, or the
 * prior alert closed/resolved — creates a fresh alert.
 *
 * Escalation semantics: an ACKNOWLEDGED alert is a commitment to the *then-
 * current* state. If the situation material escalates afterwards, that old
 * acknowledgement must not silently persist — the alert must become actionable
 * again (see `recalculateLocationRisk`, which flips it back to OPEN). The
 * `escalation` flag on an `update` decision marks such material worsening so the
 * caller knows to reopen. Non-material changes never carry it and therefore
 * never reopen an acknowledged alert.
 */
export type ActiveAlertLike = {
  level: RiskLevel;
  score: number;
  priority: AlertPriority;
  warningLevel: WarningLevel;
  status: AlertStatus;
};

export type AlertDecision =
  | { action: "none" }
  | { action: "create" }
  | {
      action: "update";
      riskScoreId: string;
      title: string;
      level: RiskLevel;
      score: number;
      priority: AlertPriorityLabel;
      confidence: number;
      warningLevel: WarningLevel;
      message: string;
      recommendedAction: string;
      /** True only when the new intelligence is a material escalation that
       *  requires an acknowledged alert to be reopened for fresh attention. */
      escalation: boolean;
    };

export function decideAlertAction(params: {
  shouldAlert: boolean;
  existing: ActiveAlertLike | null;
  riskScoreId: string;
  locationName: string;
  level: RiskLevel;
  score: number;
  priority: AlertPriorityLabel;
  confidence: number;
  warningLevel: WarningLevel;
  message: string;
  recommendedAction: string;
  escalationThreshold?: number;
}): AlertDecision {
  const { shouldAlert, existing, riskScoreId, locationName, level, score, priority, confidence, warningLevel, message, recommendedAction } = params;
  const escalationThreshold = params.escalationThreshold ?? 8;

  if (!shouldAlert) return { action: "none" };

  const title = `${priority === "P0" ? "Immediate" : priority === "P1" ? "Urgent verification" : priority === "P2" ? "Monitor" : "Info"} · ${warningLevel} · ${level} risk in ${locationName}`;

  if (!existing) return { action: "create" };

  if (existing.status !== "OPEN" && existing.status !== "ACKNOWLEDGED") {
    // Prior alert was closed/resolved/dismissed → this is a new incident.
    return { action: "create" };
  }

  const priorityChanged = existing.priority !== priority;
  const warningChanged = existing.warningLevel !== warningLevel;
  const levelChanged = existing.level !== level;
  const scoreIncreased = score - existing.score >= escalationThreshold;

  const material = isMaterialEscalation(existing, { priority, warningLevel, level, score }, escalationThreshold);

  // Refresh the alert whenever its intelligence meaningfully changed (including
  // de-escalation, e.g. priority drops or warning softens) so the queue shows
  // current data. Only a material escalation, however, requires reopening an
  // acknowledged alert; the caller uses `escalation` for that transition.
  const changed = priorityChanged || warningChanged || levelChanged || scoreIncreased;

  if (changed || material) {
    return {
      action: "update",
      riskScoreId,
      title,
      level,
      score,
      priority,
      confidence,
      warningLevel,
      message,
      recommendedAction,
      escalation: material,
    };
  }

  return { action: "none" };
}