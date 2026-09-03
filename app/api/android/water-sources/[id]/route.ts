import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const source = await prisma.waterSource.findUnique({
      where: { id },
      include: {
        location: { select: { id: true, name: true, district: true, latitude: true, longitude: true } },
        qualityObservations: { orderBy: { observedAt: "desc" }, take: 10 },
      },
    });

    if (!source) {
      return NextResponse.json({ ok: false, error: "Water source not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      waterSource: {
        id: source.id,
        name: source.name,
        type: source.type,
        status: source.status,
        lastInspectedAt: source.lastInspectedAt,
        notes: source.notes,
        location: {
          id: source.location.id,
          name: source.location.name,
          district: source.location.district,
          latitude: Number(source.location.latitude),
          longitude: Number(source.location.longitude),
        },
        observations: source.qualityObservations.map((o) => ({
          id: o.id,
          observedAt: o.observedAt,
          turbidityNTU: o.turbidityNTU,
          ph: o.ph,
          tds: o.tds,
          freeChlorine: o.freeChlorine,
          ecoliDetected: o.ecoliDetected,
          inspectionScore: o.inspectionScore,
          sampleMethod: o.sampleMethod,
          confidence: o.confidence,
          notes: o.notes,
        })),
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch water source" }, { status: 500 });
  }
}
