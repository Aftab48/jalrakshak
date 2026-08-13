import { Prisma } from "@prisma/client";
import { subHours } from "date-fns";
import { prisma } from "../lib/prisma";
import { recalculateAllRisk } from "../lib/services";

const locations = [
  ["Baksara Ward 4", "Howrah", "WARD", 22.568844, 88.287005, 18420, 4040, 2.1, 0.46],
  ["Santragachi Cluster", "Howrah", "WARD", 22.583212, 88.285731, 22680, 4980, 1.8, 0.39],
  ["Kadamtala Ward 9", "Howrah", "WARD", 22.59114, 88.30921, 31200, 6900, 2.4, 0.52],
  ["Bijoygarh Block", "Kolkata", "WARD", 22.486795, 88.363335, 27400, 6110, 1.6, 0.31],
  ["Jadavpur East", "Kolkata", "WARD", 22.49919, 88.37121, 33480, 7400, 1.7, 0.28],
  ["Salt Lake Sector 3", "Kolkata", "WARD", 22.567819, 88.415369, 18900, 4720, 1.1, 0.18],
  ["Maheshtala River Belt", "South 24 Parganas", "BLOCK", 22.50681, 88.24743, 42100, 9070, 2.8, 0.64],
  ["Uluberia Rural Pocket", "Howrah", "VILLAGE", 22.47316, 88.10953, 12860, 2810, 1.9, 0.58],
] as const;

async function main() {
  await prisma.alert.deleteMany();
  await prisma.riskScore.deleteMany();
  await prisma.rainfallObservation.deleteMany();
  await prisma.symptomReport.deleteMany();
  await prisma.waterSource.deleteMany();
  await prisma.location.deleteMany();
  await prisma.auditLog.deleteMany();

  const created = [];
  for (const [name, district, type, latitude, longitude, population, households, baseline, vulnerability] of locations) {
    const location = await prisma.location.create({
      data: {
        name,
        district,
        type,
        latitude: new Prisma.Decimal(latitude),
        longitude: new Prisma.Decimal(longitude),
        population,
        households,
        baselineDailyCases: new Prisma.Decimal(baseline),
        vulnerabilityIndex: new Prisma.Decimal(vulnerability),
      },
    });
    created.push(location);

    await prisma.waterSource.createMany({
      data: [
        {
          locationId: location.id,
          name: `${name.split(" ")[0]} municipal tap`,
          type: "MUNICIPAL_TAP",
          status: name.includes("Kadamtala") ? "SUSPECTED" : "NORMAL",
          notes: "Primary household supply point.",
        },
        {
          locationId: location.id,
          name: `${name.split(" ")[0]} hand pump`,
          type: "HAND_PUMP",
          status: name.includes("Maheshtala") ? "CONTAMINATED" : name.includes("Baksara") ? "WATCH" : "NORMAL",
          notes: "Shared source used during supply interruptions.",
        },
      ],
    });
  }

  for (const location of created) {
    const intensity = location.name.includes("Maheshtala")
      ? 19
      : location.name.includes("Kadamtala")
        ? 13
        : location.name.includes("Baksara")
          ? 9
          : 3;

    for (let hour = 144; hour >= 0; hour -= 12) {
      const monsoonPulse = hour <= 72 ? intensity + Math.sin(hour) * 4 : intensity / 2;
      await prisma.rainfallObservation.create({
        data: {
          locationId: location.id,
          observedAt: subHours(new Date(), hour),
          rainfallMm: new Prisma.Decimal(Math.max(0, monsoonPulse + randomBetween(-4, 7))),
        },
      });
    }

    const sources = await prisma.waterSource.findMany({ where: { locationId: location.id } });
    const reportCount = location.name.includes("Maheshtala")
      ? 32
      : location.name.includes("Kadamtala")
        ? 21
        : location.name.includes("Baksara")
          ? 13
          : randomInt(2, 8);

    for (let index = 0; index < reportCount; index += 1) {
      const reportedAt = subHours(new Date(), randomInt(1, 94));
      const waterSource = sources[index % sources.length];
      await prisma.symptomReport.create({
        data: {
          locationId: location.id,
          waterSourceId: index % 3 === 0 ? waterSource.id : undefined,
          source: index % 5 === 0 ? "WHATSAPP" : index % 7 === 0 ? "IVR" : "HEALTH_WORKER",
          phoneHash: `seed-${location.id}-${index % Math.max(4, Math.floor(reportCount / 2))}`,
          reporterName: ["Rina Khatun", "Mousumi Pal", "Farhan Ansari", "Debarati Sen"][index % 4],
          ageBand: ["0-5", "6-14", "15-45", "46-65", "65+"][index % 5],
          symptoms: index % 4 === 0 ? ["diarrhoea", "vomiting", "dehydration"] : ["diarrhoea", "fever"],
          severity: location.name.includes("Maheshtala") ? randomInt(3, 5) : randomInt(1, 4),
          onsetAt: subHours(reportedAt, randomInt(2, 20)),
          notes: index % 3 === 0 ? "Multiple households mentioned the same shared source." : undefined,
        },
      });
    }
  }

  await recalculateAllRisk();
  console.log(`Seeded ${created.length} locations with rainfall, reports, scores, and alerts.`);
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
