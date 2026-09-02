import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reportSchema } from "@/lib/contracts";
import { createSymptomReport } from "@/lib/services";
import { assertRateLimit, clientIp, validateTwilioSignature } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    assertRateLimit(`reports:${clientIp(request)}`, 30);

    const contentType = request.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await request.json()
      : await parseTwilioForm(request);

    const report = await createSymptomReport(reportSchema.parse(payload));
    return NextResponse.json({ ok: true, reportId: report.id, duplicateOfId: report.duplicateOfId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid report payload", issues: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return NextResponse.json({ ok: false, error: "Too many reports from this client" }, { status: 429 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "WATER_SOURCE_LOCATION_MISMATCH") {
      return NextResponse.json({ ok: false, error: "Water source does not belong to the selected location" }, { status: 400 });
    }

    return NextResponse.json({ ok: false, error: "Report intake failed" }, { status: 500 });
  }
}

async function parseTwilioForm(request: NextRequest) {
  const form = await request.formData();
  const params = Object.fromEntries(
    Array.from(form.entries()).map(([key, value]) => [key, String(value)]),
  );

  const signature = request.headers.get("x-twilio-signature");
  if (!validateTwilioSignature(request.url, params, signature)) {
    throw new Error("UNAUTHORIZED");
  }

  const message = params.Body ?? "";
  const symptoms = message
    .toLowerCase()
    .split(/[\s,;。]+/)
    .map((token) => token.trim().replace(/-/g, "_"))
    .filter((token) =>
      ["diarrhoea", "vomiting", "fever", "stomach_pain", "stomach", "pain", "dehydration", "jaundice", "rash", "headache", "weakness", "fatigue", "nausea", "body_ache", "body", "ache", "loss_of_appetite"].includes(token),
    )
    .map((token) =>
      token === "stomach" || token === "pain" ? "stomach_pain" : token === "body" || token === "ache" ? "body_ache" : token,
    )
    .filter((token, index, all) => all.indexOf(token) === index);

  return {
    locationId: params.LocationId,
    source: "WHATSAPP",
    phone: params.From,
    reporterName: params.ProfileName,
    symptoms: symptoms.length ? symptoms : ["diarrhoea"],
    severity: Number(params.Severity ?? 2),
    onsetAt: params.OnsetAt ?? new Date().toISOString(),
    notes: message.slice(0, 500),
  };
}
