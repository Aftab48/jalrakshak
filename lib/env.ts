import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  INTERNAL_API_KEY: z.string().min(16),
  TWILIO_AUTH_TOKEN: z.string().optional().default(""),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_ENV: process.env.APP_ENV ?? process.env.NODE_ENV,
  INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
});

export function assertSafeRuntime() {
  if (env.APP_ENV === "production") {
    if (env.INTERNAL_API_KEY.includes("dev-internal")) {
      throw new Error("Unsafe INTERNAL_API_KEY for production.");
    }
    if (!env.TWILIO_AUTH_TOKEN) {
      throw new Error("TWILIO_AUTH_TOKEN is required in production.");
    }
  }
}
