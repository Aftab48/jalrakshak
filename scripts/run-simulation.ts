import { subHours } from "date-fns";
import { prisma } from "../lib/prisma";
import { recalculateLocationRisk } from "../lib/services";

async function main() {
  const locations = await prisma.location.findMany({
    include: { waterSources: true },
    orderBy: { name: "asc" },
  });

  if (!locations.length) {
    throw new Error("No seeded locations found. Run npm run db:seed first.");
  }

  const target = locations.find((location) => location.name.includes("Uluberia")) ?? locations[0];
  const safe = locations.find((location) => location.name.includes("Salt Lake")) ?? locations.at(-1)!;

  await prisma.symptomReport.deleteMany({
    where: { source: "SIMULATION", notes: "Injected spike to test early-warning behavior." },
  });

  await prisma.symptomReport.createMany({
    data: Array.from({ length: 9 }).map((_, index) => ({
      locationId: target.id,
      waterSourceId: target.waterSources[0]?.id,
      source: "SIMULATION",
      phoneHash: `simulation-spike-${index}`,
      reporterName: "Simulation runner",
      ageBand: index % 2 === 0 ? "6-14" : "15-45",
      symptoms: ["diarrhoea", "vomiting", "dehydration"],
      severity: index > 5 ? 5 : 4,
      onsetAt: subHours(new Date(), 10 + index),
      reportedAt: subHours(new Date(), index + 1),
      notes: "Injected spike to test early-warning behavior.",
    })),
  });

  const targetRisk = await recalculateLocationRisk(target.id);
  const safeRisk = await recalculateLocationRisk(safe.id);

  const checks = [
    {
      name: "Spike sensitivity",
      passed: targetRisk.risk.score >= 55,
      detail: `${target.name} reached ${targetRisk.risk.score} (${targetRisk.risk.level})`,
    },
    {
      name: "Low-noise control",
      passed: safeRisk.risk.score < 55,
      detail: `${safe.name} stayed at ${safeRisk.risk.score} (${safeRisk.risk.level})`,
    },
    {
      name: "Explainability",
      passed: targetRisk.risk.reasoning.includes("symptom reports") && targetRisk.risk.factors.confidence >= 50,
      detail: targetRisk.risk.reasoning,
    },
  ];

  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.name}: ${check.detail}`);
  }

  if (checks.some((check) => !check.passed)) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
