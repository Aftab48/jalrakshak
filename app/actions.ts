"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { manualReportSchema } from "@/lib/contracts";
import { prisma } from "@/lib/prisma";
import { createSymptomReport, recalculateAllRisk } from "@/lib/services";

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
