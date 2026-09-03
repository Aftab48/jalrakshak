import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { waterQualityObservationSchema } from "@/lib/contracts";
import { createWaterQualityObservation } from "@/lib/services";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = waterQualityObservationSchema.parse(body);
    await createWaterQualityObservation(parsed);

    return NextResponse.json({ ok: true, message: "Water quality observation recorded" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid observation data", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Failed to record observation" }, { status: 500 });
  }
}
