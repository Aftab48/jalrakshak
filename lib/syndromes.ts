export const CANONICAL_SYMPTOMS = [
  "diarrhoea",
  "vomiting",
  "dehydration",
  "stomach_pain",
  "fever",
  "headache",
  "weakness",
  "fatigue",
  "nausea",
  "jaundice",
  "rash",
  "body_ache",
  "loss_of_appetite",
] as const;

export type CanonicalSymptom = (typeof CANONICAL_SYMPTOMS)[number];

export const SYNDROMES = ["acute_diarrheal", "typhoid_like", "hepatitis_like"] as const;

export type SyndromeProfile = (typeof SYNDROMES)[number];

export const SYNDROME_LABELS: Record<SyndromeProfile, string> = {
  acute_diarrheal: "Acute Diarrheal Syndrome",
  typhoid_like: "Typhoid-Like Syndrome",
  hepatitis_like: "Hepatitis-Like Syndrome",
};

export const SYNDROME_ONSET_HINT: Record<SyndromeProfile, "rapid" | "gradual"> = {
  acute_diarrheal: "rapid",
  typhoid_like: "gradual",
  hepatitis_like: "gradual",
};

/**
 * Prototype syndrome profiles. Weights are surveillance-pattern weights used for
 * signal matching only — NOT diagnostic weights and NOT medically validated.
 */
export const SYNDROME_PROFILES: Record<
  SyndromeProfile,
  { label: string; symptoms: Partial<Record<CanonicalSymptom, number>> }
> = {
  acute_diarrheal: {
    label: "Acute Diarrheal Syndrome",
    symptoms: {
      diarrhoea: 3,
      vomiting: 2,
      dehydration: 2.5,
      stomach_pain: 1.5,
      nausea: 1,
      fever: 0.5,
      weakness: 0.5,
    },
  },
  typhoid_like: {
    label: "Typhoid-Like Syndrome",
    symptoms: {
      fever: 3,
      stomach_pain: 1.5,
      headache: 1.5,
      weakness: 2,
      nausea: 1,
      loss_of_appetite: 1.5,
      diarrhoea: 0.5,
    },
  },
  hepatitis_like: {
    label: "Hepatitis-Like Syndrome",
    symptoms: {
      jaundice: 3.5,
      fatigue: 2.5,
      fever: 1,
      nausea: 2,
      stomach_pain: 1,
      body_ache: 1,
      loss_of_appetite: 1,
      weakness: 0.5,
    },
  },
};

export const isCanonicalSymptom = (value: string): value is CanonicalSymptom =>
  (CANONICAL_SYMPTOMS as readonly string[]).includes(value);

export const symptomLabel = (value: string) => value.replace(/_/g, " ");