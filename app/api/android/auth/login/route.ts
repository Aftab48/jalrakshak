import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const loginSchema = z.object({
  workerId: z.string().min(1),
  pin: z.string().min(4).max(8),
});

const DEMO_WORKERS: Record<string, { name: string; role: string; pin: string; locationId: string; assignedArea: string }> = {
  "ASHA-001": { name: "Anjali Devi", role: "ASHA Worker", pin: "1234", locationId: "", assignedArea: "Kadamtala Ward 9" },
  "ASHA-002": { name: "Priya Mondal", role: "ASHA Worker", pin: "1234", locationId: "", assignedArea: "Santragachi Cluster" },
  "ANM-001": { name: "Sunita Das", role: "ANM Worker", pin: "5678", locationId: "", assignedArea: "Maheshtala River Belt" },
  "FW-001": { name: "Rahul Kumar", role: "Field Supervisor", pin: "9012", locationId: "", assignedArea: "Uluberia Rural Pocket" },
};

function generateToken(workerId: string): string {
  const payload = `${workerId}:${Date.now()}`;
  return crypto.createHmac("sha256", env.INTERNAL_API_KEY).update(payload).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workerId, pin } = loginSchema.parse(body);

    const worker = DEMO_WORKERS[workerId];
    if (!worker || worker.pin !== pin) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    let locationId = worker.locationId;
    if (!locationId) {
      const location = await prisma.location.findFirst({
        where: {
          OR: [
            { name: { contains: worker.assignedArea, mode: "insensitive" } },
            { district: { contains: worker.assignedArea, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      locationId = location?.id ?? "";
    }

    const token = generateToken(workerId);

    await prisma.auditLog.create({
      data: {
        actor: workerId,
        action: "worker.login",
        entity: "Worker",
        entityId: workerId,
        metadata: { role: worker.role },
      },
    });

    return NextResponse.json({
      ok: true,
      token,
      worker: {
        id: workerId,
        name: worker.name,
        role: worker.role,
        assignedArea: worker.assignedArea,
        locationId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Login failed" }, { status: 500 });
  }
}
