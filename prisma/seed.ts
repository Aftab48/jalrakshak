import { Prisma } from "@prisma/client";
import { subDays, subHours } from "date-fns";
import { prisma } from "../lib/prisma";
import { recalculateAllRisk } from "../lib/services";
import { computeDiseaseSignals } from "../lib/disease-engine";

type LocationSeed = {
  name: string;
  district: string;
  type: "VILLAGE" | "WARD" | "BLOCK";
  latitude: number;
  longitude: number;
  population: number;
  households: number;
  baseline: number;
  vulnerability: number;
  pattern:
    | "normal"
    | "watch-seasonal"
    | "early-water"
    | "outbreak"
    | "hidden"
    | "sensor-gap"
    | "cluster-pairs";
};

const locations: LocationSeed[] = [
  {
    name: "Baksara Ward 4",
    district: "Howrah",
    type: "WARD",
    latitude: 22.568844,
    longitude: 88.287005,
    population: 18420,
    households: 4040,
    baseline: 2.1,
    vulnerability: 0.46,
    pattern: "watch-seasonal",
  },
  {
    name: "Santragachi Cluster",
    district: "Howrah",
    type: "WARD",
    latitude: 22.583212,
    longitude: 88.285731,
    population: 22680,
    households: 4980,
    baseline: 1.8,
    vulnerability: 0.39,
    pattern: "normal",
  },
  {
    name: "Kadamtala Ward 9",
    district: "Howrah",
    type: "WARD",
    latitude: 22.59114,
    longitude: 88.30921,
    population: 31200,
    households: 6900,
    baseline: 2.4,
    vulnerability: 0.52,
    pattern: "early-water",
  },
  {
    name: "Bijoygarh Block",
    district: "Kolkata",
    type: "WARD",
    latitude: 22.486795,
    longitude: 88.363335,
    population: 27400,
    households: 6110,
    baseline: 1.6,
    vulnerability: 0.31,
    pattern: "sensor-gap",
  },
  {
    name: "Jadavpur East",
    district: "Kolkata",
    type: "WARD",
    latitude: 22.49919,
    longitude: 88.37121,
    population: 33480,
    households: 7400,
    baseline: 1.7,
    vulnerability: 0.28,
    pattern: "normal",
  },
  {
    name: "Salt Lake Sector 3",
    district: "Kolkata",
    type: "WARD",
    latitude: 22.567819,
    longitude: 88.415369,
    population: 18900,
    households: 4720,
    baseline: 1.1,
    vulnerability: 0.18,
    pattern: "normal",
  },
  {
    name: "Maheshtala River Belt",
    district: "South 24 Parganas",
    type: "BLOCK",
    latitude: 22.50681,
    longitude: 88.24743,
    population: 42100,
    households: 9070,
    baseline: 2.8,
    vulnerability: 0.64,
    pattern: "outbreak",
  },
  {
    name: "Uluberia Rural Pocket",
    district: "Howrah",
    type: "VILLAGE",
    latitude: 22.47316,
    longitude: 88.10953,
    population: 12860,
    households: 2810,
    baseline: 1.9,
    vulnerability: 0.58,
    pattern: "hidden",
  },
];

const RAIN_PATTERNS: Record<LocationSeed["pattern"], { ramp: number; peak: number; offset: number }> = {
  normal: { ramp: 8, peak: 18, offset: 4 },
  "watch-seasonal": { ramp: 14, peak: 130, offset: 10 },
  "early-water": { ramp: 18, peak: 110, offset: 6 },
  outbreak: { ramp: 26, peak: 160, offset: 8 },
  hidden: { ramp: 10, peak: 70, offset: 5 },
  "sensor-gap": { ramp: 6, peak: 25, offset: 3 },
  "cluster-pairs": { ramp: 8, peak: 40, offset: 4 },
};

const WATER_RULES: Record<LocationSeed["pattern"], { status: "NORMAL" | "WATCH" | "SUSPECTED" | "CONTAMINATED"; turbidity: number; chlorine: number; ecoli: boolean; inspection: number }> = {
  normal: { status: "NORMAL", turbidity: 1.5, chlorine: 0.7, ecoli: false, inspection: 88 },
  "watch-seasonal": { status: "WATCH", turbidity: 3.2, chlorine: 0.45, ecoli: false, inspection: 72 },
  "early-water": { status: "SUSPECTED", turbidity: 7.8, chlorine: 0.22, ecoli: true, inspection: 46 },
  outbreak: { status: "CONTAMINATED", turbidity: 12.4, chlorine: 0.05, ecoli: true, inspection: 28 },
  hidden: { status: "SUSPECTED", turbidity: 5.6, chlorine: 0.3, ecoli: true, inspection: 58 },
  "sensor-gap": { status: "NORMAL", turbidity: 2.0, chlorine: 0.6, ecoli: false, inspection: 80 },
  "cluster-pairs": { status: "NORMAL", turbidity: 1.8, chlorine: 0.65, ecoli: false, inspection: 84 },
};

const SURGE: Record<LocationSeed["pattern"], number | null> = {
  normal: null,
  "watch-seasonal": 2.1,
  "early-water": 1.6,
  outbreak: 5.5,
  hidden: 1.5,
  "sensor-gap": 1.1,
  "cluster-pairs": null,
};

const OUTBREAK_SYMPTOMS = ["diarrhoea", "vomiting", "dehydration", "stomach_pain"];
const MILD_SYMPTOMS = ["fever", "weakness", "nausea", "headache", "body_ache"];
const WATER_SYMPTOMS = ["diarrhoea", "fever", "stomach_pain"];

async function main() {
  await prisma.alert.deleteMany();
  await prisma.riskScore.deleteMany();
  await prisma.rainfallObservation.deleteMany();
  await prisma.symptomReport.deleteMany();
  await prisma.waterQualityObservation.deleteMany();
  await prisma.waterSource.deleteMany();
  await prisma.location.deleteMany();
  await prisma.auditLog.deleteMany();

  const now = new Date();
  const created: Array<{ location: Awaited<ReturnType<typeof prisma.location.create>>; seed: LocationSeed }> = [];

  for (const seed of locations) {
    const location = await prisma.location.create({
      data: {
        name: seed.name,
        district: seed.district,
        state: "West Bengal",
        type: seed.type,
        latitude: new Prisma.Decimal(seed.latitude),
        longitude: new Prisma.Decimal(seed.longitude),
        population: seed.population,
        households: seed.households,
        baselineDailyCases: new Prisma.Decimal(seed.baseline),
        vulnerabilityIndex: new Prisma.Decimal(seed.vulnerability),
      },
    });
    created.push({ location, seed });
  }

  const waterSources = new Map<
    string,
    Array<{ id: string; name: string; type: "MUNICIPAL_TAP" | "HAND_PUMP" | "TUBE_WELL" | "POND" }>
  >();

  for (const { location, seed } of created) {
    const rules = WATER_RULES[seed.pattern];
    const primaryType = seed.type === "VILLAGE" ? "HAND_PUMP" : "MUNICIPAL_TAP";
    const sources: Array<{
      name: string;
      type: "MUNICIPAL_TAP" | "HAND_PUMP" | "TUBE_WELL" | "POND";
      status: "NORMAL" | "WATCH" | "SUSPECTED" | "CONTAMINATED";
    }> = [
      {
        name: `${seed.name.split(" ")[0]} ${primaryType === "HAND_PUMP" ? "hand pump" : "municipal tap"}`,
        type: primaryType,
        status: rules.status,
      },
      {
        name: `${seed.name.split(" ")[0]} tube well`,
        type: "TUBE_WELL",
        status: seed.pattern === "outbreak" ? "SUSPECTED" : "NORMAL",
      },
      {
        name: `${seed.name.split(" ")[0]} pond`,
        type: "POND",
        status: seed.pattern === "hidden" ? "WATCH" : "NORMAL",
      },
    ];

    const rows: Prisma.WaterSourceCreateManyInput[] = [];
    for (const source of sources) {
      rows.push({
        locationId: location.id,
        name: source.name,
        type: source.type,
        status: source.status,
        lastInspectedAt:
          seed.pattern === "sensor-gap" ? subDays(now, 45) : subDays(now, randomInt(7, 40)),
        notes:
          seed.pattern === "outbreak" || seed.pattern === "early-water"
            ? "Shared supply point with repeated complaints from residents."
            : "Routine surface water monitoring point.",
      });
    }
    await prisma.waterSource.createMany({ data: rows });
    const stored = await prisma.waterSource.findMany({ where: { locationId: location.id } });
    const named = stored.map((source, index) => ({
      id: source.id,
      name: source.name,
      type: (sources[index]?.type ?? "TUBE_WELL") as "MUNICIPAL_TAP" | "HAND_PUMP" | "TUBE_WELL" | "POND",
    }));
    waterSources.set(location.id, named);
  }

  // --- Multi-week rainfall (daily, 60 days) ------------------------------------------
  for (const { location, seed } of created) {
    const rain = RAIN_PATTERNS[seed.pattern];
    const rainRows = Array.from({ length: 60 }).map((_, day) => {
      const monsoonLift = day <= 18 ? Math.sqrt(18 - day + 1) * (rain.ramp / 4) + rain.offset : 0;
      return {
        locationId: location.id,
        observedAt: subDays(now, day),
        rainfallMm: new Prisma.Decimal(
          Math.max(0, rain.peak * (day <= 18 ? (19 - day) / 19 : 0.12) * (1 + (Math.random() - 0.5) * 0.5) + monsoonLift),
        ),
        source: "synthetic-imd",
      };
    });
    await prisma.rainfallObservation.createMany({ data: rainRows });
  }

  // --- 45–90 day disease-log + recent surges with true coordinates --------------------
  for (const { location, seed } of created) {
    const surge = SURGE[seed.pattern];
    const rules = WATER_RULES[seed.pattern];
    const short = seed.name.split(" ")[0].slice(0, 4).toLowerCase();
    const rows: Prisma.SymptomReportCreateManyInput[] = [];

    for (let day = 0; day < 90; day += 1) {
      if (day >= 45 && surge == null && seed.pattern !== "outbreak") continue;
      const factor =
        day < 60 ? 1.0 : seed.pattern === "watch-seasonal" ? 1.15 : seed.pattern === "outbreak" ? 0.9 : 1.0;
      const seasonalNoise = 1 + Math.sin(day / 5) * 0.18;
      let count = Math.max(1, Math.round(Math.max(0, seed.baseline * factor * seasonalNoise + randomBetween(-0.6, 1.1))));

      if (day <= 9) {
        if (surge != null) {
          count = Math.round(seed.baseline * surge * (day <= 3 ? 1 + (3 - day) / 3 : 0.9));
        } else if (seed.pattern === "early-water") {
          count = Math.round(seed.baseline * 1.6 * (day <= 2 ? 1.2 : 0.8));
        }
      }

      for (let index = 0; index < count; index += 1) {
        const reportedAt = subHours(subDays(now, day), randomInt(0, 22));
        const outbreakDay = day <= 9 && (seed.pattern === "outbreak" || (surge != null && surge >= 2));
        const waterDay = day <= 9 && seed.pattern === "early-water";
        const hiddenDay = day <= 9 && seed.pattern === "hidden";
        const symptoms = outbreakDay
          ? OUTBREAK_SYMPTOMS.slice(0, randomInt(3, 4))
          : waterDay
            ? WATER_SYMPTOMS.slice(0, randomInt(2, 3))
            : hiddenDay
              ? MILD_SYMPTOMS.slice(0, randomInt(2, 4))
              : Math.random() < 0.35
                ? ["diarrhoea"]
                : MILD_SYMPTOMS.slice(0, randomInt(1, 2));

        const phonePool = seed.pattern === "outbreak" ? 34 : seed.pattern === "early-water" ? 22 : 16;
        const burstPhone =
          waterDay && index >= 2 ? "burst-single-phone" : Math.floor(Math.random() * phonePool) + 1;
        const tight = day <= 9;
        const pocketOffset = 0;
        rows.push({
          locationId: location.id,
          waterSourceId: waterDay ? waterSources.get(location.id)?.[0]?.id : undefined,
          reportedAt,
          source:
            day > 40 || Math.random() < 0.25 ? "HEALTH_WORKER" : Math.random() < 0.5 ? "WHATSAPP" : "IVR",
          phoneHash: `${short}-${burstPhone}`,
          reporterName: pick(["Rina Khatun", "Mousumi Pal", "Farhan Ansari", "Debarati Sen", "Shahid Mondal"]),
          ageBand: pick(["0-5", "6-14", "15-45", "46-65", "65+"]),
          symptoms,
          severity: outbreakDay ? randomInt(3, 5) : day <= 9 ? randomInt(2, 4) : randomInt(1, 3),
          onsetAt: subHours(reportedAt, randomInt(2, 26)),
          latitude: new Prisma.Decimal(Number(location.latitude) + jitter(tight ? 0.0009 : 0.004) + pocketOffset),
          longitude: new Prisma.Decimal(Number(location.longitude) + jitter(tight ? 0.0009 : 0.004) + pocketOffset),
          notes: waterDay ? "Multiple households mentioned the same shared source." : undefined,
          syndromeSignal: ((syndrome) =>
            syndrome.dominant
              ? ({
                  syndrome: syndrome.dominant.syndrome,
                  percent: syndrome.dominant.percent,
                  scores: syndrome.scores,
                } as Prisma.InputJsonValue)
              : undefined)(computeDiseaseSignals({ symptoms, onsetDays: randomInt(0, 2) })),
        });
      }
    }

    // Water-quality observations (weekly lab + recent field test)
    const sources = waterSources.get(location.id)!;
    const wqRows: Prisma.WaterQualityObservationCreateManyInput[] = [];
    const wq = waterRowsFor(rules, now, seed.pattern);
    for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
      const source = sources[sourceIndex];
      const primary = sourceIndex === 0;
      const gap = seed.pattern === "sensor-gap";
      const weeks = gap ? 1 : 3;
      for (let weeksBack = 0; weeksBack <= weeks; weeksBack += 1) {
        if (weeksBack === 0 && seed.pattern === "outbreak" && sourceIndex === 1) continue;
        wqRows.push({
          waterSourceId: source.id,
          observedAt: subDays(now, weeksBack * 7 + randomInt(0, 1)),
          turbidityNTU: primary ? wq.turbidity * (1 + randomBetween(-0.15, 0.3)) : round1(wq.turbidity / 2 + 1),
          ph: round1(7 + randomBetween(-0.4, 0.4)),
          tds: Math.round(110 + (primary ? 420 : 140) * randomBetween(0.8, 1.2)),
          freeChlorine: primary ? Math.max(0, round1(wq.chlorine + (Math.random() - 0.5) * 0.15)) : round1(0.7 + randomBetween(-0.1, 0.2)),
          ecoliDetected: primary ? wq.ecoli : false,
          inspectionScore: primary ? clampInt(wq.inspection + randomInt(-6, 8), 0, 100) : clampInt(wq.inspection + 12, 0, 100),
          sampleMethod: weeksBack === 0 ? "FIELD_TEST" : "LAB",
          confidence: 0.8,
          notes: weeksBack === 0 ? "On-visit field sample." : "Weekly laboratory panel.",
        });
      }
    }

    await prisma.symptomReport.createMany({ data: rows.filter(Boolean) });
    await prisma.waterQualityObservation.createMany({ data: wqRows });
  }

  await recalculateAllRisk();

  const summary = await prisma.riskScore.findMany({
    orderBy: { computedAt: "desc" },
    include: { location: true },
  });
  const latest = new Map<string, (typeof summary)[number]>();
  for (const score of summary) {
    if (!latest.has(score.locationId)) latest.set(score.locationId, score);
  }
  console.log("Seeded V2 demo data. Latest model output per location:");
  for (const { location } of created) {
    const score = latest.get(location.id);
    if (score) {
      console.log(
        `  ${location.name.padEnd(26)} ${score.warningLevel.padEnd(13)} ${score.level.padEnd(9)} ${String(score.score).padEnd(3)} conf ${score.confidence} ${score.priority}`,
      );
    }
  }
}

function waterRowsFor(
  rules: (typeof WATER_RULES)[LocationSeed["pattern"]],
  _now: Date,
  pattern: LocationSeed["pattern"],
) {
  if (pattern === "sensor-gap") {
    return { turbidity: 2, chlorine: 0.6, ecoli: false, inspection: 80 };
  }
  return rules;
}

function jitter(spread: number) {
  return (Math.random() - 0.5) * spread * 2;
}
function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}
function round1(value: number) {
  return Math.round(value * 10) / 10;
}
function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });