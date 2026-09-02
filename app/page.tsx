import { getDashboardData } from "@/lib/services";
import { DashboardView } from "./components/dashboard-view";
import { type PlottedLocation } from "./components/interactive-risk-map";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getDashboardData();
  const plottedLocations: PlottedLocation[] = data.locations.map((location) => {
    const score = data.latestByLocation.get(location.id);
    const waterIntel = data.waterIntelligence.filter((w) => w.locationId === location.id);
    const locationAlerts = data.openAlerts
      .filter((a) => a.locationId === location.id)
      .map((a) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        level: a.level,
        priority: a.priority,
        warningLevel: a.warningLevel,
        status: a.status,
        recommendedAction: a.recommendedAction,
        triggeredAt: a.triggeredAt,
      }));
    const rawMetrics = score?.rawMetrics as {
      rainfall72h?: number;
      reasons?: string[];
      recommendedAction?: string[];
    } | null;

    return {
      id: location.id,
      name: location.name,
      district: location.district,
      type: location.type,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      population: location.population,
      households: location.households,
      vulnerabilityIndex: Number(location.vulnerabilityIndex),
      baselineDailyCases: Number(location.baselineDailyCases),
      score: score?.score ?? 0,
      level: score?.level ?? "LOW",
      warningLevel: score?.warningLevel ?? "NORMAL",
      priority: score?.priority ?? "P3",
      confidence: score?.confidence ?? 50,
      dominantSyndrome: score?.dominantSyndrome && score.dominantSyndrome !== "none" ? score.dominantSyndrome : null,
      reasoning: score?.reasoning ?? "Routine baseline surveillance active.",
      factors: (score?.factors as Record<string, number>) ?? {},
      reasons: rawMetrics?.reasons ?? [],
      recommendedAction: rawMetrics?.recommendedAction ?? [],
      rainfall72h: rawMetrics?.rainfall72h ?? waterIntel[0]?.rainfallMm72h ?? 0,
      reportsCount24h: data.reports.filter((r) => r.locationId === location.id).length,
      waterSources: location.waterSources.map((source) => {
        const intel = waterIntel.find((w) => w.id === source.id);
        return {
          id: source.id,
          name: source.name,
          type: source.type,
          status: source.status,
          waterRisk: intel?.waterRisk,
          warningLevel: intel?.warningLevel,
          turbidityNTU: intel?.turbidityNTU ?? null,
          freeChlorine: intel?.freeChlorine ?? null,
          ecoliDetected: intel?.ecoliDetected ?? null,
          inspectionScore: intel?.inspectionScore ?? null,
          reasons: intel?.reasons ?? [],
        };
      }),
      alerts: locationAlerts,
    };
  });

  return (
    <DashboardView
      locations={plottedLocations}
      openAlerts={data.openAlerts}
      latestScores={data.latestScores}
      waterIntelligence={data.waterIntelligence}
      reports={data.reports}
      rawLocations={data.locations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        district: loc.district,
        waterSources: loc.waterSources.map((ws) => ({ id: ws.id, name: ws.name })),
      }))}
    />
  );
}