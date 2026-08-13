import { z } from "zod";
import { safeString } from "./security";

export const symptomOptions = [
  "diarrhoea",
  "vomiting",
  "fever",
  "stomach_pain",
  "dehydration",
  "jaundice",
  "rash",
  "headache",
] as const;

export const reportSchema = z.object({
  locationId: z.string().cuid(),
  waterSourceId: z.string().cuid().optional().nullable(),
  source: z.enum(["WHATSAPP", "IVR", "DASHBOARD", "HEALTH_WORKER", "SIMULATION"]).default("DASHBOARD"),
  phone: z.string().trim().max(32).optional(),
  reporterName: z.string().trim().max(90).optional(),
  ageBand: z.enum(["0-5", "6-14", "15-45", "46-65", "65+"]).optional(),
  symptoms: z.array(z.enum(symptomOptions)).min(1).max(6),
  severity: z.coerce.number().int().min(1).max(5).default(2),
  onsetAt: z.coerce.date(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  notes: safeString(500).optional(),
});

export type ReportInput = z.infer<typeof reportSchema>;

export const manualReportSchema = reportSchema.extend({
  onsetAt: z.string().min(10),
});
