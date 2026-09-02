/**
 * Scoped delete filters for a location's simulation evidence. Keeping this as a
 * pure helper (no database access) makes the "cleanup must not touch other
 * locations" behaviour unit-testable. Every filter is narrowed to the given
 * location (symptom/rainfall via locationId, water observations via the
 * location's own water-source ids) so running a scenario for one location never
 * removes scenario data belonging to another location.
 */
export function buildScenarioCleanupFilters(locationId: string, waterSourceIds: string[]) {
  return {
    symptomReports: {
      locationId,
      source: "SIMULATION" as const,
      notes: { contains: "scenario:simulation" },
    },
    waterObservations: {
      sampleMethod: "SIMULATION" as const,
      notes: { contains: "scenario:simulation" },
      waterSourceId: { in: waterSourceIds },
    },
    rainfallObservations: {
      locationId,
      source: "synthetic-scenario",
    },
  };
}