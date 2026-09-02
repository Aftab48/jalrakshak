import { SYNDROME_LABELS, SYNDROME_ONSET_HINT, SYNDROME_PROFILES, type SyndromeProfile } from "./syndromes";

export type DiseaseInput = {
  symptoms: string[];
  onsetDays?: number | null;
  severity?: number | null;
};

export type SyndromeSignal = {
  syndrome: SyndromeProfile;
  patternMatch: number;
  percent: number;
};

export type DiseaseOutput = {
  dominant: SyndromeSignal | null;
  scores: Record<SyndromeProfile, number>;
  matchedSymptoms: Record<SyndromeProfile, string[]>;
  reasons: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function computeDiseaseSignals(input: DiseaseInput): DiseaseOutput {
  const symptoms = new Set(input.symptoms);
  const onsetDays = input.onsetDays ?? null;
  const rapidOnset = onsetDays !== null && onsetDays <= 1;
  const gradualOnset = onsetDays !== null && onsetDays >= 4;

  const scores = {} as Record<SyndromeProfile, number>;
  const matchedSymptoms = {} as Record<SyndromeProfile, string[]>;
  const rawMax = {} as Record<SyndromeProfile, number>;

  for (const syndrome of Object.keys(SYNDROME_PROFILES) as SyndromeProfile[]) {
    const profile = SYNDROME_PROFILES[syndrome];
    let raw = 0;
    const matched: string[] = [];
    for (const [symptom, weight] of Object.entries(profile.symptoms)) {
      if (symptoms.has(symptom)) {
        raw += weight;
        matched.push(symptom);
      }
    }
    const onsetBonus =
      SYNDROME_ONSET_HINT[syndrome] === "rapid" && rapidOnset
        ? 1
        : SYNDROME_ONSET_HINT[syndrome] === "gradual" && gradualOnset
          ? 1
          : 0;
    rawMax[syndrome] = Object.values(profile.symptoms).reduce((sum, value) => sum + value, 0) + 1;
    scores[syndrome] = clamp((raw + onsetBonus) / rawMax[syndrome], 0, 1);
    matchedSymptoms[syndrome] = matched;
  }

  const ranked = (Object.keys(scores) as SyndromeProfile[]).sort((a, b) => scores[b] - scores[a]);
  const top = ranked[0];
  const resolution = top && scores[top] > 0 ? Math.max(0, scores[top] - (ranked[1] ? scores[ranked[1]] : 0)) : 0;

  let dominant: SyndromeSignal | null = null;
  const reasons: string[] = [];
  if (top && scores[top] > 0.12) {
    const percent = Math.round(scores[top] * 100);
    dominant = { syndrome: top, patternMatch: Math.round(scores[top] * 100) / 100, percent };
    reasons.push(
      `Dominant syndrome signal: ${SYNDROME_LABELS[top]} — ${percent}% pattern match`,
    );
    if (matchedSymptoms[top].length) reasons.push(`matched symptoms: ${matchedSymptoms[top].join(", ")}`);
    if (resolution > 0) reasons.push(`pattern is ${resolution >= 0.3 ? "clearly" : "moderately"} separated from other syndromes`);
    if (scores[top] <= 0.4) reasons.push("pattern match is weak — treat as a low-certainty surveillance signal");
  } else {
    reasons.push("no useful syndrome pattern detected in current reports");
  }

  return { dominant, scores, matchedSymptoms, reasons };
}