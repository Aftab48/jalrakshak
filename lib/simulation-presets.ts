export const SCENARIO_IDS = [
  "TRUE_OUTBREAK",
  "HEAVY_RAIN_ONLY",
  "WATER_CONTAMINATION_ONLY",
  "SEASONAL_INCREASE",
  "DUPLICATE_REPORT_ATTACK",
  "SENSOR_DATA_FAILURE",
  "HIDDEN_OUTBREAK",
  "MULTIPLE_HOTSPOTS",
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

export type ScenarioMeta = {
  label: string;
  description: string;
  expected: string;
};

export const SCENARIOS: Record<ScenarioId, ScenarioMeta> = {
  TRUE_OUTBREAK: {
    label: "True outbreak",
    description: "Sharp diarrheal spike, contaminated water, heavy rain, clustered neighbourhood.",
    expected: "High/critical risk, OUTBREAK warning, P0 priority, high confidence.",
  },
  HEAVY_RAIN_ONLY: {
    label: "Heavy rain only",
    description: "Intense rainfall with no case increase and no water evidence.",
    expected: "WATCH, not an outbreak — the system must not panic on one signal.",
  },
  WATER_CONTAMINATION_ONLY: {
    label: "Water contamination only",
    description: "Contaminated source with normal case counts.",
    expected: "Early warning driven by water risk before case numbers rise.",
  },
  SEASONAL_INCREASE: {
    label: "Seasonal increase",
    description: "Slow, smooth doubling of baseline across two weeks.",
    expected: "WATCH/normal. A rolling baseline absorbs seasonality.",
  },
  DUPLICATE_REPORT_ATTACK: {
    label: "Duplicate report attack",
    description: "Many synthetic reports from only two phones.",
    expected: "Low confidence, dampened risk, no P0.",
  },
  SENSOR_DATA_FAILURE: {
    label: "Sensor/data failure",
    description: "No water observations, no rainfall data, few reports.",
    expected: "Low confidence — evidence gap surfaced instead of inflated risk.",
  },
  HIDDEN_OUTBREAK: {
    label: "Hidden outbreak",
    description: "No classic diarrheal spike; indirect signals only (fever/weakness, mildly contaminated water, small cluster).",
    expected: "EARLY_WARNING through indirect signals.",
  },
  MULTIPLE_HOTSPOTS: {
    label: "Multiple hotspots",
    description: "Two distant neighbourhoods with separate clusters.",
    expected: "Multiple spatial clusters, elevated risk across both.",
  },
};

export type WhatIfAdjustments = {
  rainfallMm72h: number;
  symptomIncrease: number;
  growthRate: number;
  waterContamination: number;
  populationVulnerability: number;
  spatialStrength: number;
  ecoliPositive: boolean;
  noRainfallEvidence?: boolean;
  noWaterEvidence?: boolean;
  uniquePhones?: number;
  historyScale?: number;
};

export const DEFAULT_WHAT_IF: WhatIfAdjustments = {
  rainfallMm72h: 10,
  symptomIncrease: 1,
  growthRate: 0,
  waterContamination: 0,
  populationVulnerability: 0.35,
  spatialStrength: 0,
  ecoliPositive: false,
};

export const SCENARIO_PRESETS: Record<ScenarioId, WhatIfAdjustments> = {
  TRUE_OUTBREAK: { rainfallMm72h: 95, symptomIncrease: 6, growthRate: 0.9, waterContamination: 0.85, populationVulnerability: 0.5, spatialStrength: 1, ecoliPositive: true, uniquePhones: 9 },
  HEAVY_RAIN_ONLY: { rainfallMm72h: 150, symptomIncrease: 1, growthRate: 0.1, waterContamination: 0.05, populationVulnerability: 0.35, spatialStrength: 0, ecoliPositive: false, uniquePhones: 2 },
  WATER_CONTAMINATION_ONLY: { rainfallMm72h: 12, symptomIncrease: 1, growthRate: 0.1, waterContamination: 0.9, populationVulnerability: 0.4, spatialStrength: 0.4, ecoliPositive: true, uniquePhones: 3 },
  SEASONAL_INCREASE: { rainfallMm72h: 30, symptomIncrease: 2, growthRate: 0.35, waterContamination: 0.15, populationVulnerability: 0.35, spatialStrength: 0.3, ecoliPositive: false, uniquePhones: 4, historyScale: 1.8 },
  DUPLICATE_REPORT_ATTACK: { rainfallMm72h: 2, symptomIncrease: 5, growthRate: 0.2, waterContamination: 0, populationVulnerability: 0.35, spatialStrength: 0.9, ecoliPositive: false, uniquePhones: 2 },
  SENSOR_DATA_FAILURE: { rainfallMm72h: 0, symptomIncrease: 1.2, growthRate: 0, waterContamination: 0, populationVulnerability: 0.35, spatialStrength: 0, ecoliPositive: false, noRainfallEvidence: true, noWaterEvidence: true, uniquePhones: 1 },
  HIDDEN_OUTBREAK: { rainfallMm72h: 22, symptomIncrease: 1.4, growthRate: 0.2, waterContamination: 0.55, populationVulnerability: 0.45, spatialStrength: 0.6, ecoliPositive: true, uniquePhones: 5 },
  MULTIPLE_HOTSPOTS: { rainfallMm72h: 20, symptomIncrease: 4, growthRate: 0.6, waterContamination: 0.4, populationVulnerability: 0.5, spatialStrength: 1, ecoliPositive: false, uniquePhones: 8 },
};