const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export type GeoReport = {
  id?: string;
  latitude?: number | null;
  longitude?: number | null;
  symptoms?: string[];
  phoneHash?: string | null;
};

export type SpatialCluster = {
  center: { latitude: number; longitude: number };
  radiusMeters: number;
  householdCount: number;
  uniqueReporters: number;
  dominantSymptoms: string[];
  members: number;
};

export type SpatialInput = {
  reports: GeoReport[];
  maxRadiusMeters?: number;
  minClusterSize?: number;
};

export type SpatialOutput = {
  clusters: SpatialCluster[];
  spatialSignal: number;
  strongest: SpatialCluster | null;
  analyzedCount: number;
  reasons: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function dominantSymptoms(memberSymptomSets: string[][]): string[] {
  const counts = new Map<string, number>();
  for (const symptoms of memberSymptomSets) {
    for (const symptom of symptoms) {
      counts.set(symptom, (counts.get(symptom) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([symptom]) => symptom);
}

/**
 * Simple prototype clustering. Reports with coordinates are greedily grouped
 * when they fall within `maxRadiusMeters` of an existing cluster center.
 */
export function computeSpatialClusters(input: SpatialInput): SpatialOutput {
  const maxRadius = input.maxRadiusMeters ?? 900;
  const minClusterSize = input.minClusterSize ?? 3;
  const positioned = input.reports.filter(
    (report) => report.latitude != null && report.longitude != null,
  );

  const clusters: SpatialCluster[] = [];
  const memberSymptoms: string[][][] = [];
  for (const report of positioned) {
    const lat = report.latitude as number;
    const lon = report.longitude as number;
    let placed = false;
    for (let clusterIndex = 0; clusterIndex < clusters.length; clusterIndex += 1) {
      const cluster = clusters[clusterIndex];
      const distance = haversineMeters(cluster.center.latitude, cluster.center.longitude, lat, lon);
      if (distance <= maxRadius) {
        const members = cluster.members + 1;
        cluster.center.latitude = (cluster.center.latitude * (members - 1) + lat) / members;
        cluster.center.longitude = (cluster.center.longitude * (members - 1) + lon) / members;
        cluster.radiusMeters = Math.max(cluster.radiusMeters, Math.round(distance));
        cluster.members = members;
        if (report.phoneHash) cluster.uniqueReporters += 1;
        memberSymptoms[clusterIndex].push(report.symptoms ?? []);
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push({
        center: { latitude: lat, longitude: lon },
        radiusMeters: 0,
        householdCount: 1,
        uniqueReporters: report.phoneHash ? 1 : 0,
        dominantSymptoms: report.symptoms ?? [],
        members: 1,
      });
      memberSymptoms.push([report.symptoms ?? []]);
    }
  }

  const resolved = clusters
    .map((cluster, index) => ({
      ...cluster,
      householdCount: cluster.uniqueReporters || cluster.members,
      dominantSymptoms: dominantSymptoms(memberSymptoms[index]),
    }))
    .filter((cluster) => cluster.members >= minClusterSize);

  const strongest = resolved.sort((a, b) => b.members - a.members)[0] ?? null;

  const signalTarget = 10;
  const spatialSignal = strongest
    ? clamp(round2(clamp(Math.log2(strongest.uniqueReporters || strongest.members) / Math.log2(signalTarget), 0, 1) + 0.15), 0, 1)
    : 0;

  const reasons: string[] = [];
  if (strongest) {
    const people = strongest.uniqueReporters || strongest.members;
    reasons.push(
      `${people} related ${people === 1 ? "household" : "households"} detected within ~${Math.max(strongest.radiusMeters, 150)} m`,
    );
    if (strongest.dominantSymptoms.length)
      reasons.push(`cluster symptom focus: ${strongest.dominantSymptoms.join(", ")}`);
  } else if (positioned.length >= 2) {
    reasons.push("reports are geographically dispersed — no meaningful cluster detected");
  } else if (positioned.length === 1) {
    reasons.push("only a single located report — cannot confirm spatial clustering");
  } else {
    reasons.push("no report coordinates available for spatial analysis");
  }

  return {
    clusters: resolved,
    spatialSignal,
    strongest,
    analyzedCount: positioned.length,
    reasons,
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}