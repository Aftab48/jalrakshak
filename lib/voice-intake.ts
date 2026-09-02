import { z } from "zod";

/**
 * Multilingual voice intake — backend/domain architecture only.
 *
 * The Android app is OUT OF SCOPE. This module defines the adapter contract,
 * a rule-based demo adapter, and canonical normalization so that a future ASR
 * service can swap in without touching the intelligence pipeline. There is NO
 * production speech-recognition backend here; anything produced by this module
 * must be clearly labeled as simulated/demo output.
 */

export const VOICE_LANGUAGES = [
  { code: "hi", name: "Hindi", script: "Devanagari" },
  { code: "bn", name: "Bengali", script: "Bengali" },
  { code: "mr", name: "Marathi", script: "Devanagari" },
  { code: "te", name: "Telugu", script: "Telugu" },
  { code: "ta", name: "Tamil", script: "Tamil" },
  { code: "gu", name: "Gujarati", script: "Gujarati" },
  { code: "kn", name: "Kannada", script: "Kannada" },
  { code: "or", name: "Odia", script: "Odia" },
] as const;

export type VoiceLanguageCode = (typeof VOICE_LANGUAGES)[number]["code"];

export type VoiceIntakeAdapter = {
  name: string;
  transcribe(audioInput: unknown, language?: VoiceLanguageCode): Promise<{ text: string; language: VoiceLanguageCode; confidence: number }>;
};

export type ParsedVoiceReport = {
  language: VoiceLanguageCode;
  text: string;
  symptoms: string[];
  durationDays: number | null;
  severity: number;
  source: "IVR";
  missing: ("locationId" | "symptoms" | "waterSourceId")[];
};

/**
 * Demo adapter. Transcribes by assuming the input already *is* a text utterance
 * (URLs or structured payloads unsupported). Clearly a mock — no ASR runs here.
 */
export const MockVoiceIntakeAdapter: VoiceIntakeAdapter = {
  name: "mock-rule-adapter (simulated, no ASR backend)",
  async transcribe(input: unknown, language) {
    if (typeof input !== "string") {
      throw new Error("MOCK_ADAPTER_STRING_ONLY");
    }
    return {
      text: input,
      language: language ?? detectLanguage(input),
      confidence: 0.6,
    };
  },
};

export function detectLanguage(text: string): VoiceLanguageCode {
  const sample = text.trim();
  if (/[\u0980-\u09FF]/.test(sample)) return "bn";
  if (/[\u0B80-\u0BFF]/.test(sample)) return "or";
  if (/[\u0951-\u0952]/.test(sample)) return "hi"; // rare
  if (/[\u0900-\u097F]/.test(sample)) {
    // Devanagari covers hi + mr; disambiguate via known Marathi terms
    if (/पाणी|सोबत|आहे|ताप/.test(sample)) return "mr";
    return "hi";
  }
  if (/[\u0C00-\u0C7F]/.test(sample)) return "te";
  if (/[\u0B80-\u0BFF]/.test(sample)) return "or";
  if (/[\u0B00-\u0B7F]/.test(sample)) return "ta";
  if (/[\u0A80-\u0AFF]/.test(sample)) return "gu";
  if (/[\u0C80-\u0CFF]/.test(sample)) return "kn";
  return "hi";
}

/**
 * Synthetic keyword dictionaries — a small demo subset, NOT medically verified
 * translations. Enough to demonstrate the normalization pipeline for each of
 * the 8 target languages.
 */
const SYMPTOM_TERMS: Record<VoiceLanguageCode, Array<[string, string[]]>> = {
  hi: [
    ["diarrhoea", ["दस्त", "पेट खराब", "उल्टी-दस्त"]],
    ["vomiting", ["उल्टी", "ऊल्टी"]],
    ["fever", ["बुखार", "ताप"]],
    ["dehydration", ["कमजोरी", "पानी की कमी"]],
    ["stomach_pain", ["पेट दर्द"]],
    ["headache", ["सिर दर्द"]],
    ["weakness", ["अशक्तता"]],
  ],
  bn: [
    ["diarrhoea", ["পেট খারাপ", "ডায়রিয়া", "উদরাময়"]],
    ["vomiting", ["বমি", "বমি হওয়া"]],
    ["fever", ["জ্বর"]],
    ["dehydration", ["জলশূন্যতা", "শারীরিক দুর্বলতা"]],
    ["stomach_pain", ["পেটে ব্যথা", "পেট ব্যথা"]],
    ["headache", ["মাথা ব্যথা"]],
    ["nausea", ["বমি বমি ভাব"]],
  ],
  mr: [["diarrhoea", ["जुलाब", "पोटदुखी"]], ["vomiting", ["उलटी"]], ["fever", ["ताप"]], ["stomach_pain", ["पोटदुखी"]]],
  te: [["diarrhoea", ["అతిసారం", "కడుపు నొప్పి"]], ["vomiting", ["వాంతులు"]], ["fever", ["జ్వరం"]], ["stomach_pain", ["కడుపు నొప్పి"]]],
  ta: [["diarrhoea", ["வயிற்றுப்போக்கு"]], ["vomiting", ["வாந்தி"]], ["fever", ["காய்ச்சல்"]], ["stomach_pain", ["வயிறு வலி"]]],
  gu: [["diarrhoea", ["ઝાડા"]], ["vomiting", ["ઊલટી"]], ["fever", ["તાવ"]], ["stomach_pain", ["પેટના દુખાવા"]]],
  kn: [["diarrhoea", ["ಅತಿಸಾರ"]], ["vomiting", ["ವಾಂತಿ"]], ["fever", ["ಜ್ವರ"]], ["stomach_pain", ["ಹೊಟ್ಟೆ ನೋವು"]]],
  or: [["diarrhoea", ["ଝାଡ଼ା"]], ["vomiting", ["ବାନ୍ତି"]], ["fever", ["ଜ୍ୱର"]], ["stomach_pain", ["ପେଟ ଯନ୍ତ୍ରଣା"]]],
};

const NUMBER_WORDS: Partial<Record<VoiceLanguageCode, Record<string, number>>> = {
  hi: { एक: 1, दो: 2, तीन: 3, चार: 4, पाँच: 5 },
  bn: { এক: 1, দুই: 2, তিন: 3, চার: 4, পাঁচ: 5 },
  mr: { एक: 1, दो: 2, तीन: 3, चार: 4, पाच: 5 },
};

const DIGITS = new Map<string, number>();
for (let digit = 0; digit <= 9; digit += 1) {
  DIGITS.set(String(digit), digit);
  DIGITS.set("۰۱۲۳۴۵۶۷۸۹"[digit], digit); // Arabic-Indic
  DIGITS.set("०१२३४५६७८९"[digit], digit); // Devanagari
  DIGITS.set("০১২৩৪৫৬৭৮৯"[digit], digit); // Bengali
}

export function extractSymptoms(text: string, language: VoiceLanguageCode): string[] {
  const terms = SYMPTOM_TERMS[language] ?? [];
  const found = new Set<string>();
  for (const [canonical, phrases] of terms) {
    for (const phrase of phrases) {
      if (text.includes(phrase)) {
        found.add(canonical);
        break;
      }
    }
  }
  return [...found];
}

export function extractDurationDays(text: string, language: VoiceLanguageCode): number | null {
  for (const digit of text) {
    const value = DIGITS.get(digit);
    if (value !== undefined) return value;
  }
  const words = NUMBER_WORDS[language] ?? {};
  for (const [word, value] of Object.entries(words)) {
    if (text.includes(word)) return value;
  }
  return null;
}

export const voiceReportSchema = z.object({
  text: z.string().min(1).max(800),
  language: z.enum(["hi", "bn", "mr", "te", "ta", "gu", "kn", "or"]).optional(),
  locationId: z.string().cuid().optional(),
  waterSourceId: z.string().cuid().optional().nullable(),
});

/**
 * Rule-based demo parse. In production this would be: ASR → language detection →
 * translation/normalization → symptom extraction → structured report.
 */
export function parseVoiceReport(input: z.infer<typeof voiceReportSchema>): ParsedVoiceReport {
  const { text } = voiceReportSchema.parse(input);
  const language = input.language ?? detectLanguage(text);
  const symptoms = extractSymptoms(text, language);
  const durationDays = extractDurationDays(text, language);

  const missing: ParsedVoiceReport["missing"] = [];
  if (symptoms.length === 0) missing.push("symptoms");
  if (!input.locationId) missing.push("locationId");

  return {
    language,
    text,
    symptoms,
    durationDays,
    severity: symptoms.includes("dehydration") ? 4 : 2,
    source: "IVR",
    missing,
  };
}

export const DEMO_VOICE_EXAMPLES: Array<{ language: VoiceLanguageCode; utterance: string; labels: string[] }> = [
  { language: "bn", utterance: "দুই দিন ধরে পেট খারাপ আর বমি হচ্ছে", labels: ["diarrhoea", "vomiting"] },
  { language: "hi", utterance: "दो दिन से दस्त और उल्टी है", labels: ["diarrhoea", "vomiting"] },
  { language: "mr", utterance: "वाढदिवस... ताप आला आहे", labels: ["fever"] },
  { language: "ta", utterance: "இரண்டு நாட்களாக வயிற்றுப்போக்கு", labels: ["diarrhoea"] },
];