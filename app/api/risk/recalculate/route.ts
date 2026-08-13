import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertInternalRequest } from "@/lib/security";
import { recalculateAllRisk, recalculateLocationRisk } from "@/lib/services";

const payloadSchema = z.object({
  locationId: z.string().cuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    assertInternalRequest(request);
    const payload = payloadSchema.parse(await request.json().catch(() => ({})));
    const results = payload.locationId
      ? [await recalculateLocationRisk(payload.locationId)]
      : await recalculateAllRisk();

    return NextResponse.json({
      ok: true,
      recalculated: results.length,
      scores: results.map(({ location, risk }) => ({
        locationId: location.id,
        location: location.name,
        score: risk.score,
        level: risk.level,
        reasoning: risk.reasoning,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid recalculation request" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Risk recalculation failed" }, { status: 500 });
  }
}
