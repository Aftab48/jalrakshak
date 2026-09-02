import type { RiskLevel, AlertPriority, WarningLevel, AlertStatus } from "@prisma/client";
import type { AlertPriorityLabel } from "./alert-priority-engine";

/**
 * Pure decision logic for the alert queue, kept separate from any database
 * access so it can be unit-tested independently.
 *
 * Design: keep a single active (OPEN/ACKNOWLEDGED) alert per location. Repeated
 * recomputation of the same incident updates that alert (risk, level, priority,
 * warning, reasoning, message, recommended action) rather than creating a
 * second active queue entry. A genuinely new incident — no active alert, or the
 * prior alert closed/resolved — creates a fresh alert.
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
  const levelChanged = existing.level !== level;
  const escalated = score - existing.score >= escalationThreshold;

  if (priorityChanged || levelChanged || escalated) {
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
    };
  }

  return { action: "none" };
}