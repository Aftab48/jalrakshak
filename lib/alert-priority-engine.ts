export type AlertPriorityLabel = "P0" | "P1" | "P2" | "P3";

export type PriorityInput = {
  risk: number;
  confidence: number;
  populationExposure: number;
  vulnerability: number;
  growth: number;
};

export type PriorityOutput = {
  priority: AlertPriorityLabel;
  priorityScore: number;
  exposure: number;
  reasons: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Prototype decision-priority model. Not a clinical standard.
 *
 * Priority is a *product* of normalized factors (risk, confidence,
 * population exposure, vulnerability, growth) so that every component has to
 * matter. Confidence deliberately participates — high risk with thin evidence is
 * de-prioritised toward urgent verification rather than immediate response.
 */
export function computePriority(input: PriorityInput): PriorityOutput {
  const exposure = clamp(input.populationExposure, 0.1, 1);
  const vulnerability = clamp(input.vulnerability, 0.1, 1);
  const growth = clamp(input.growth, 0.1, 1);
  const risk01 = clamp(input.risk / 100, 0.05, 1);
  const confidence01 = clamp(input.confidence / 100, 0.2, 1);

  const priorityScore = round4(risk01 * confidence01 * exposure * vulnerability * growth);

  let priority: AlertPriorityLabel;
  if (priorityScore >= 0.06 || (input.risk >= 75 && input.confidence >= 70)) priority = "P0";
  else if (priorityScore >= 0.02 || input.risk >= 65) priority = "P1";
  else if (priorityScore >= 0.008 || input.risk >= 42) priority = "P2";
  else priority = "P3";

  const reasons: string[] = [];
  if (priority === "P0") reasons.push("critical combination of high risk and corroborating evidence");
  if (priority === "P1") reasons.push("notable risk with partial evidence or growing population exposure");
  if (priority === "P2") reasons.push("moderate risk — continue surveillance and verification");
  if (priority === "P3") reasons.push("low priority — passive surveillance");
  if (input.confidence < 40 && input.risk >= 55) reasons.push("high risk but weak evidence — field verification required before escalation");
  if (exposure >= 0.6) reasons.push("significant share of households potentially exposed");
  if (growth >= 0.5) reasons.push("rapid recent growth in reports");

  return { priority, priorityScore, exposure, reasons };
}

function round4(value: number) {
  return Math.round(value * 10_000) / 10_000;
}