import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const verificationSchema = z.object({
  alertId: z.string().cuid(),
  casesPresent: z.enum(["YES", "NO", "UNCLEAR"]),
  affectedPeople: z.number().int().min(0).max(100000).nullish(),
  affectedHouseholds: z.number().int().min(0).max(10000).nullish(),
  symptoms: z.array(z.string()).max(13).default([]),
  waterSourceId: z.string().cuid().nullish(),
  waterCondition: z.enum(["NORMAL", "SUSPICIOUS", "POOR"]).nullish(),
  notes: z.string().trim().max(500).nullish(),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
  verifiedBy: z.string().trim().max(90).default("android-field-worker"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verificationSchema.parse(body);

    const alert = await prisma.alert.findUnique({ where: { id: parsed.alertId } });
    if (!alert) {
      return NextResponse.json({ ok: false, error: "Alert not found" }, { status: 404 });
    }

    const verification = await prisma.fieldVerification.create({
      data: {
        alertId: parsed.alertId,
        casesPresent: parsed.casesPresent,
        affectedPeople: parsed.affectedPeople ?? undefined,
        affectedHouseholds: parsed.affectedHouseholds ?? undefined,
        symptoms: parsed.symptoms,
        waterSourceId: parsed.waterSourceId ?? undefined,
        waterCondition: parsed.waterCondition ?? undefined,
        notes: parsed.notes,
        latitude: parsed.latitude != null ? new Prisma.Decimal(parsed.latitude) : undefined,
        longitude: parsed.longitude != null ? new Prisma.Decimal(parsed.longitude) : undefined,
        verifiedBy: parsed.verifiedBy,
      },
    });

    await prisma.auditLog.create({
      data: {
        actor: parsed.verifiedBy,
        action: "alert.verified",
        entity: "Alert",
        entityId: parsed.alertId,
        metadata: { casesPresent: parsed.casesPresent, verificationId: verification.id },
      },
    });

    return NextResponse.json({ ok: true, verificationId: verification.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid verification payload" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 500 });
  }
}