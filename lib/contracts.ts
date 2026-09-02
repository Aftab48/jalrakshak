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
  "weakness",
  "fatigue",
  "nausea",
  "body_ache",
  "loss_of_appetite",
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

export const waterQualityObservationSchema = z.object({
  waterSourceId: z.string().cuid(),
  observedAt: z.coerce.date().optional(),
  turbidityNTU: z.coerce.number().min(0).max(300).nullish(),
  ph: z.coerce.number().min(0).max(14).nullish(),
  tds: z.coerce.number().min(0).max(5000).nullish(),
  freeChlorine: z.coerce.number().min(0).max(5).nullish(),
  ecoliDetected: z.boolean().nullish(),
  inspectionScore: z.coerce.number().int().min(0).max(100).nullish(),
  sampleMethod: z.enum(["FIELD_TEST", "LAB", "SENSOR", "DEMO", "SIMULATION"]).default("DEMO"),
  confidence: z.coerce.number().min(0).max(1).default(0.5),
  notes: safeString(300).nullable().optional(),
});

export type WaterQualityInput = z.infer<typeof waterQualityObservationSchema>;

export const simulationScenarioSchema = z.object({
  scenario: z.enum([
    "TRUE_OUTBREAK",
    "HEAVY_RAIN_ONLY",
    "WATER_CONTAMINATION_ONLY",
    "SEASONAL_INCREASE",
    "DUPLICATE_REPORT_ATTACK",
    "SENSOR_DATA_FAILURE",
    "HIDDEN_OUTBREAK",
    "MULTIPLE_HOTSPOTS",
  ]),
  locationId: z.string().cuid().optional(),
});

export const whatIfSchema = z.object({
  rainfallMm72h: z.coerce.number().min(0).max(300),
  symptomIncrease: z.coerce.number().min(0).max(12),
  growthRate: z.coerce.number().min(0).max(1),
  waterContamination: z.coerce.number().min(0).max(1),
  populationVulnerability: z.coerce.number().min(0).max(1),
  spatialStrength: z.coerce.number().min(0).max(1),
  ecoliPositive: z.preprocess((value) => value === "true" || value === true, z.boolean()),
  noRainfallEvidence: z.preprocess((value) => value === "true" || value === true, z.boolean()).default(false),
  noWaterEvidence: z.preprocess((value) => value === "true" || value === true, z.boolean()).default(false),
  uniquePhones: z.coerce.number().int().min(1).max(20).optional(),
  historyScale: z.coerce.number().min(0.5).max(4).optional(),
});

export const voiceIntakeSchema = z.object({
  text: z.string().trim().min(1).max(800),
  language: z.enum(["hi", "bn", "mr", "te", "ta", "gu", "kn", "or"]).optional(),
});

export type VoiceIntakeInput = z.infer<typeof voiceIntakeSchema>;