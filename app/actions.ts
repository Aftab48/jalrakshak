"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  manualReportSchema,
  simulationScenarioSchema,
  waterQualityObservationSchema,
  whatIfSchema,
} from "@/lib/contracts";
import { prisma } from "@/lib/prisma";
import {
  createSymptomReport,
  createWaterQualityObservation,
  recalculateAllRisk,
  runSimulationScenario,
} from "@/lib/services";
import { DEFAULT_WHAT_IF, simulateWhatIf } from "@/lib/simulation-engine";

export type ActionState = {
  ok: boolean;
  message: string;
};

export async function submitManualReport(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const symptoms = formData.getAll("symptoms").map(String);
    const parsed = manualReportSchema.parse({
      locationId: formData.get("locationId"),
      waterSourceId: formData.get("waterSourceId") || undefined,
      source: "DASHBOARD",
      reporterName: formData.get("reporterName") || undefined,
      ageBand: formData.get("ageBand") || undefined,
      symptoms,
      severity: formData.get("severity"),
      onsetAt: formData.get("onsetAt"),
      notes: formData.get("notes") || undefined,
    });

    await createSymptomReport({ ...parsed, onsetAt: new Date(parsed.onsetAt) });
    revalidatePath("/");
    return { ok: true, message: "Report added and local risk recalculated." };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, message: "Check the report fields. Symptoms and onset time are required." };
    }
    return { ok: false, message: "Could not add report. Try again after checking the selected location." };
  }
}

export async function acknowledgeAlert(formData: FormData) {
  const id = String(formData.get("alertId") ?? "");
  if (!id) return;

  await prisma.alert.update({
    where: { id },
    data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: { actor: "dashboard", action: "alert.acknowledged", entity: "Alert", entityId: id },
  });
  revalidatePath("/");
}

export async function resolveAlert(formData: FormData) {
  const id = String(formData.get("alertId") ?? "");
  if (!id) return;

  await prisma.alert.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: { actor: "dashboard", action: "alert.resolved", entity: "Alert", entityId: id },
  });
  revalidatePath("/");
}

export async function recalculateRiskAction() {
  await recalculateAllRisk();
  revalidatePath("/");
}

export type ScenarioActionState = {
  ok: boolean;
  message: string;
  output?: {
    scenario: string;
    label: string;
    warningLevel: string;
    level: string;
    score: number;
    confidence: number;
    priority: string;
    reasons: string[];
    recommendedAction: string[];
    reasoning: string;
  };
};

export async function runSimulationScenarioAction(input: unknown): Promise<ScenarioActionState> {
  try {
    const parsed = simulationScenarioSchema.parse(input);
    const result = await runSimulationScenario(parsed.scenario, parsed.locationId);
    revalidatePath("/");
    const SCENARIO_LABELS: Record<string, string> = {
      TRUE_OUTBREAK: "True outbreak",
      HEAVY_RAIN_ONLY: "Heavy rain only",
      WATER_CONTAMINATION_ONLY: "Water contamination only",
      SEASONAL_INCREASE: "Seasonal increase",
      DUPLICATE_REPORT_ATTACK: "Duplicate report attack",
      SENSOR_DATA_FAILURE: "Sensor/data failure",
      HIDDEN_OUTBREAK: "Hidden outbreak",
      MULTIPLE_HOTSPOTS: "Multiple hotspots",
    };
    return {
      ok: true,
      message: `Scenario "${parsed.scenario}" applied to ${result.location}.`,
      output: {
        scenario: parsed.scenario,
        label: SCENARIO_LABELS[parsed.scenario] ?? parsed.scenario,
        warningLevel: result.risk.warningLevel,
        level: result.risk.level,
        score: result.risk.score,
        confidence: result.risk.confidence,
        priority: result.risk.priority,
        reasons: result.risk.reasons,
        recommendedAction: result.risk.recommendedAction,
        reasoning: result.risk.reasoning,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, message: "Unknown simulation scenario." };
    }
    return {
      ok: false,
      message:
        "Scenario could not be applied — this writes synthetic records and needs a reachable database.",
    };
  }
}

export async function submitWaterQualityObservation(input: unknown): Promise<ActionState> {
  try {
    const parsed = waterQualityObservationSchema.parse(input);
    await createWaterQualityObservation(parsed);
    revalidatePath("/");
    return { ok: true, message: "Water quality observation recorded." };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, message: "Check the water quality fields." };
    }
    return { ok: false, message: "Could not record the observation." };
  }
}

export async function simulateWhatIfAction(input: unknown): Promise<
  ActionState & {
    result?: {
      score: number;
      level: string;
      warningLevel: string;
      warningIndex: number;
      confidence: number;
      priority: string;
      priorityScore: number;
      factors: Record<string, number>;
      syndrome: string | null;
      syndromePercent: number | null;
      reasons: string[];
      recommendedAction: string[];
      confidenceBreakdown: Record<string, number>;
    };
  }
> {
  try {
    const parsed = whatIfSchema
      .extend({ locationId: z.string().cuid().optional() })
      .parse(input ?? {});

    const location = parsed.locationId
      ? await prisma.location.findUniqueOrThrow({ where: { id: parsed.locationId } })
      : await prisma.location.findFirstOrThrow();

    const risk = simulateWhatIf(
      {
        locationName: location.name,
        population: location.population,
        households: location.households,
        baselineDailyCases: Number(location.baselineDailyCases),
        vulnerabilityIndex: Number(location.vulnerabilityIndex),
      },
      { ...DEFAULT_WHAT_IF, ...parsed },
    );

    return {
      ok: true,
      message: "What-if projection computed against the real risk engine.",
      result: {
        score: risk.score,
        level: risk.level,
        warningLevel: risk.warningLevel,
        warningIndex: risk.warningIndex,
        confidence: risk.confidence,
        priority: risk.priority,
        priorityScore: risk.priorityScore,
        factors: risk.factors,
        syndrome: risk.dominantSyndrome,
        syndromePercent: risk.syndromePercent,
        reasons: risk.reasons,
        recommendedAction: risk.recommendedAction,
        confidenceBreakdown: risk.confidenceBreakdown,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, message: "Some what-if values are out of range." };
    }
    return { ok: false, message: "What-if projection could not be computed." };
  }
}
