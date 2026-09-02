import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { env } from "./env";

const requestHits = new Map<string, { count: number; resetAt: number }>();

/**
 * Deterministic pseudonymous reporter identifier.
 *
 * HMAC-SHA256(normalizedPhone, serverSecret) is used instead of plain SHA-256 so
 * the digest is keyed by a server-side secret. Storing the hash still means a
 * given phone maps to a stable, non-reversible identifier; raw phone numbers are
 * never persisted or exposed on the dashboard. This is a security-conscious
 * prototype architecture — not a claim of production-grade security.
 */
export function hashPhone(value: string) {
  const normalized = value.replace(/[^\d+]/g, "");
  const secret =
    process.env.PHONE_HASH_SECRET ?? env.INTERNAL_API_KEY;
  return crypto.createHmac("sha256", secret).update(normalized).digest("hex");
}

export function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function assertRateLimit(key: string, limit = 40, windowMs = 60_000) {
  const now = Date.now();
  const hit = requestHits.get(key);
  if (!hit || hit.resetAt <= now) {
    requestHits.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  hit.count += 1;
  if (hit.count > limit) {
    throw new Error("RATE_LIMITED");
  }
}

export function assertInternalRequest(request: NextRequest) {
  const received = request.headers.get("x-internal-api-key");
  if (!received || received !== env.INTERNAL_API_KEY) {
    throw new Error("UNAUTHORIZED");
  }
}

export function validateTwilioSignature(requestUrl: string, params: Record<string, string>, signature: string | null) {
  if (!env.TWILIO_AUTH_TOKEN) return true;
  if (!signature) return false;

  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => `${acc}${key}${params[key]}`, requestUrl);

  const expected = crypto
    .createHmac("sha1", env.TWILIO_AUTH_TOKEN)
    .update(Buffer.from(payload, "utf-8"))
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export const safeString = (max = 280) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .transform((value) => value.replace(/[\u0000-\u001F\u007F]/g, ""));
