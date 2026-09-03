import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({
  status: z.enum(["ACKNOWLEDGED", "RESOLVED"]),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = statusSchema.parse(body);

    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Alert not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "ACKNOWLEDGED") {
      updateData.acknowledgedAt = new Date();
    } else if (status === "RESOLVED") {
      updateData.resolvedAt = new Date();
    }

    await prisma.alert.update({ where: { id }, data: updateData });
    await prisma.auditLog.create({
      data: {
        actor: "android-field-worker",
        action: `alert.${status.toLowerCase()}`,
        entity: "Alert",
        entityId: id,
        metadata: { previousStatus: existing.status, newStatus: status },
      },
    });

    return NextResponse.json({ ok: true, alertId: id, status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid status value" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Failed to update alert" }, { status: 500 });
  }
}
