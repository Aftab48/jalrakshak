"use client";

import React, { useState, useMemo, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  Bell,
  Droplets,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ChevronDown,
  Building2,
  Navigation,
  Globe2,
  Filter,
} from "lucide-react";
import { acknowledgeAlert, recalculateRiskAction, resolveAlert } from "../actions";
import { InteractiveRiskMap, type PlottedLocation } from "./interactive-risk-map";
import { WhatIfSimulator } from "./what-if-simulator";
import { ScenarioRunner } from "./scenario-runner";
import { ReportForm } from "./report-form";

const levelClass: Record<string, string> = {
  LOW: "level low",
  MODERATE: "level moderate",
  HIGH: "level high",
  CRITICAL: "level critical",
};

const warningClass: Record<string, string> = {
  NORMAL: "warning-pill normal",
  WATCH: "warning-pill moderate",
  EARLY_WARNING: "warning-pill high",
  OUTBREAK: "warning-pill critical",
};

const priorityClass: Record<string, string> = {
  P0: "priority-pill p0",
  P1: "priority-pill p1",
  P2: "priority-pill p2",
  P3: "priority-pill p3",
};

const FACTOR_LABELS = [
  ["diseaseSignal", "Syndrome match"],
  ["anomaly", "Anomaly vs baseline"],
  ["growth", "24h growth"],
  ["water", "Water quality"],
  ["environmental", "Rainfall"],
  ["spatial", "Spatial cluster"],
  ["vulnerability", "Vulnerability"],
  ["exposure", "Population exposure"],
] as const;

function levelForWarning(warning: string) {
  if (warning === "OUTBREAK") return "critical";
  if (warning === "EARLY_WARNING") return "high";
  if (warning === "WATCH") return "moderate";
  return "low";
}

// Additional regions available for future datasets
const FUTURE_REGIONS = [
  { id: "ext:delhi", name: "Delhi NCR", state: "Delhi", basin: "Yamuna Floodplain Zone" },
  { id: "ext:mumbai", name: "Mumbai Metropolitan", state: "Maharashtra", basin: "Mithi & Thane Creek Basin" },
  { id: "ext:bengaluru", name: "Bengaluru Urban", state: "Karnataka", basin: "Vrishabhavathi River Basin" },
  { id: "ext:patna", name: "Patna District", state: "Bihar", basin: "Ganges Riverine Belt" },
  { id: "ext:varanasi", name: "Varanasi Ghats Pocket", state: "Uttar Pradesh", basin: "Ganges Urban Aquifer" },
  { id: "ext:jaipur", name: "Jaipur District", state: "Rajasthan", basin: "Dravyavati Semi-Arid Belt" },
];

export interface DashboardViewProps {
  locations: PlottedLocation[];
  openAlerts: Array<{
    id: string;
    locationId: string;
    title: string;
    message: string;
    score: number;
    confidence: number;
    level: string;
    priority: string;
    warningLevel: string;
    status: string;
    recommendedAction: string;
    triggeredAt: Date | string;
    location: { id: string; name: string };
  }>;
  latestScores: Array<{
    id: string;
    locationId: string;
    score: number;
    level: string;
    warningLevel: string;
    priority: string;
    confidence: number;
    reasoning: string;
    dominantSyndrome: string;
    factors: unknown;
    location: { id: string; name: string };
  }>;
  waterIntelligence: Array<{
    id: string;
    name: string;
    locationName: string;
    locationId: string;
    type: string;
    status: string;
    waterRisk: number;
    warningLevel: string;
    turbidityNTU: number | null;
    freeChlorine: number | null;
    ecoliDetected: boolean | null;
    inspectionScore: number | null;
    rainfallMm72h: number;
    reasons: string[];
  }>;
  reports: Array<{
    id: string;
    locationId: string;
    symptoms: string[];
    severity: number;
    reportedAt: Date | string;
    syndromeSignal: unknown;
    location: { id: string; name: string };
  }>;
  rawLocations: Array<{
    id: string;
    name: string;
    district: string;
    waterSources: Array<{ id: string; name: string }>;
  }>;
}

export function DashboardView({
  locations,
  openAlerts,
  latestScores,
  waterIntelligence,
  reports,
  rawLocations,
}: DashboardViewProps) {
  // Selected location or region filter
  // "ALL" | "district:Howrah" | "district:Kolkata" | "district:South 24 Parganas" | "loc:<id>" | "ext:<id>"
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");

  // Get distinct districts from loaded locations
  const districts = useMemo(() => {
    const set = new Set<string>();
    locations.forEach((loc) => set.add(loc.district));
    return Array.from(set).sort();
  }, [locations]);

  // Check if selected filter is an external/future region
  const externalRegion = useMemo(() => {
    if (selectedFilter.startsWith("ext:")) {
      return FUTURE_REGIONS.find((r) => r.id === selectedFilter) ?? null;
    }
    return null;
  }, [selectedFilter]);

  // Filtered locations
  const activeLocations = useMemo(() => {
    if (externalRegion) return [];
    if (selectedFilter === "ALL") return locations;
    if (selectedFilter.startsWith("district:")) {
      const dist = selectedFilter.replace("district:", "");
      return locations.filter((loc) => loc.district.toLowerCase() === dist.toLowerCase());
    }
    if (selectedFilter.startsWith("loc:")) {
      const locId = selectedFilter.replace("loc:", "");
      return locations.filter((loc) => loc.id === locId);
    }
    return locations;
  }, [locations, selectedFilter, externalRegion]);

  // Active location IDs set for fast lookup
  const activeLocIds = useMemo(() => new Set(activeLocations.map((l) => l.id)), [activeLocations]);

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    if (externalRegion) return [];
    if (selectedFilter === "ALL") return openAlerts;
    return openAlerts.filter((a) => activeLocIds.has(a.locationId));
  }, [openAlerts, selectedFilter, activeLocIds, externalRegion]);

  // Filtered Scores
  const filteredScores = useMemo(() => {
    if (externalRegion) return [];
    if (selectedFilter === "ALL") return latestScores;
    return latestScores.filter((s) => activeLocIds.has(s.locationId));
  }, [latestScores, selectedFilter, activeLocIds, externalRegion]);

  // Filtered Water Intelligence
  const filteredWater = useMemo(() => {
    if (externalRegion) return [];
    if (selectedFilter === "ALL") return waterIntelligence;
    return waterIntelligence.filter((w) => activeLocIds.has(w.locationId));
  }, [waterIntelligence, selectedFilter, activeLocIds, externalRegion]);

  // Filtered Reports
  const filteredReports = useMemo(() => {
    if (externalRegion) return [];
    if (selectedFilter === "ALL") return reports;
    return reports.filter((r) => activeLocIds.has(r.locationId));
  }, [reports, selectedFilter, activeLocIds, externalRegion]);

  // Dynamic Metrics
  const metrics = useMemo(() => {
    if (externalRegion) {
      return {
        monitoredLocations: 0,
        activeWarnings: 0,
        openAlerts: 0,
        reports24h: 0,
      };
    }
    const watchCount = activeLocations.filter((l) => l.warningLevel === "WATCH").length;
    const earlyWarningsCount = activeLocations.filter((l) =>
      ["EARLY_WARNING", "OUTBREAK"].includes(l.warningLevel)
    ).length;
    const reports24h = activeLocations.reduce((sum, l) => sum + (l.reportsCount24h ?? 0), 0);



    return {
      monitoredLocations: activeLocations.length,
      activeWarnings: watchCount + earlyWarningsCount,
      openAlerts: filteredAlerts.length,
      reports24h,
    };
  }, [activeLocations, filteredAlerts, externalRegion]);

  // Current scope label
  const scopeLabel = useMemo(() => {
    if (externalRegion) return `${externalRegion.name} (${externalRegion.state})`;
    if (selectedFilter === "ALL") return "All Monitored Pilot Belts";
    if (selectedFilter.startsWith("district:")) {
      return `${selectedFilter.replace("district:", "")} District`;
    }
    if (selectedFilter.startsWith("loc:")) {
      const found = locations.find((l) => l.id === selectedFilter.replace("loc:", ""));
      return found ? `${found.name} (${found.district})` : "Selected Zone";
    }
    return "All Pilot Belts";
  }, [selectedFilter, externalRegion, locations]);

  // Simulator target location — updated by map marker clicks or resets when scope changes
  const [selectedSimLocationId, setSelectedSimLocationId] = useState<string | undefined>(undefined);

  // Reset simulator selection whenever the active scope changes so a stale map
  // pick from a previous district/location filter cannot bleed through.
  useEffect(() => {
    setSelectedSimLocationId(undefined);
  }, [selectedFilter]);

  // Target Location ID for Simulator/Runner — map pick wins, then scope default
  const targetLocationId = selectedSimLocationId ?? activeLocations[0]?.id ?? locations[0]?.id;

  return (
    <main className="app-shell">
      <aside className="rail">
        <div className="brand-mark">JR</div>
        <nav aria-label="Primary">
          <a href="#map" aria-label="Risk map">
            <MapPin size={20} />
          </a>
          <a href="#alerts" aria-label="Alerts">
            <Bell size={20} />
          </a>
          <a href="#intake" aria-label="Intake">
            <Activity size={20} />
          </a>
        </nav>
      </aside>

      <section className="workspace">
        {/* Topbar with Global Location Selector */}
        <header className="topbar">
          <div>
            <p className="eyebrow">JalRakshak Command Center · Surveillance Scope</p>
            <h1>Early-warning for waterborne outbreaks.</h1>
            <p className="topbar-sub">
              Risk scores are separated from evidence confidence; alert priority blends both. Currently viewing:{" "}
              <strong>{scopeLabel}</strong>.
            </p>
          </div>

          <div className="topbar-controls">
            {/* Location Selector Dropdown */}
            <div className="location-selector-wrapper">
              <label htmlFor="global-location-select" className="location-selector-label">
                <Navigation size={14} className="text-accent" />
                <span>Region & Location</span>
              </label>
              <div className="location-select-container">
                <select
                  id="global-location-select"
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="global-location-select"
                  aria-label="Select region or location to filter dashboard"
                >
                  <optgroup label="Overview (Active Datasets)">
                    <option value="ALL">All Pilot Locations ({locations.length} zones)</option>
                  </optgroup>

                  <optgroup label="By Monitored District">
                    {districts.map((dist) => {
                      const count = locations.filter((l) => l.district === dist).length;
                      return (
                        <option key={`dist-${dist}`} value={`district:${dist}`}>
                          {dist} District ({count} {count === 1 ? "zone" : "zones"})
                        </option>
                      );
                    })}
                  </optgroup>

                  <optgroup label="By Monitored Zone / Ward">
                    {locations.map((loc) => (
                      <option key={`loc-${loc.id}`} value={`loc:${loc.id}`}>
                        {loc.name} · {loc.district} ({loc.warningLevel.replace("_", " ")})
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="Other Regions (Future Datasets)">
                    {FUTURE_REGIONS.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}, {region.state} (Awaiting Data)
                      </option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            </div>

            <form action={recalculateRiskAction}>
              <button className="ghost-button" title="Recalculate risk across surveillance network">
                <RefreshCw size={16} />
                Recalculate
              </button>
            </form>
          </div>
        </header>

        {/* Quick District Filter Chips */}
        <div className="district-quick-bar" role="toolbar" aria-label="District quick filters">
          <span className="quick-bar-label">
            <Filter size={13} /> Quick Filter:
          </span>
          <button
            type="button"
            className={`district-chip ${selectedFilter === "ALL" ? "active" : ""}`}
            onClick={() => setSelectedFilter("ALL")}
          >
            All Pilot Belts ({locations.length})
          </button>
          {districts.map((dist) => {
            const count = locations.filter((l) => l.district === dist).length;
            const isSelected = selectedFilter === `district:${dist}`;
            return (
              <button
                type="button"
                key={`chip-${dist}`}
                className={`district-chip ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedFilter(`district:${dist}`)}
              >
                <Building2 size={13} />
                {dist} ({count})
              </button>
            );
          })}
          <div className="quick-divider" />
          <span className="quick-bar-sub">Other Regions:</span>
          {FUTURE_REGIONS.slice(0, 3).map((r) => (
            <button
              type="button"
              key={`chip-${r.id}`}
              className={`district-chip future ${selectedFilter === r.id ? "active" : ""}`}
              onClick={() => setSelectedFilter(r.id)}
            >
              <Globe2 size={13} />
              {r.name}
            </button>
          ))}
        </div>

        {/* External / Future Region Notice Banner */}
        {externalRegion && (
          <div className="future-region-banner">
            <div className="future-banner-content">
              <Globe2 size={24} className="text-accent" />
              <div>
                <h3>
                  {externalRegion.name}, {externalRegion.state} · {externalRegion.basin}
                </h3>
                <p>
                  Surveillance channel configured. Data stream is ready for sensor ingestion, lab telemetry, and IVR/WhatsApp intake reports.
                </p>
              </div>
            </div>
            <div className="future-banner-actions">
              <a href="#intake" className="primary-button mini">
                Submit Initial Case Report
              </a>
              <button
                type="button"
                className="ghost-button mini"
                onClick={() => setSelectedFilter("ALL")}
              >
                Back to Active Belts
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Metric Strip */}
        <section className="metric-strip" aria-label="Overview metrics">
          <Metric
            icon={<MapPin size={18} />}
            label={`Monitored in ${scopeLabel}`}
            value={metrics.monitoredLocations}
          />
          <Metric
            icon={<ShieldAlert size={18} />}
            label="Active warnings"
            value={metrics.activeWarnings}
          />
          <Metric
            icon={<Bell size={18} />}
            label="Open alerts"
            value={metrics.openAlerts}
          />
          <Metric
            icon={<Activity size={18} />}
            label="Reports in 24h"
            value={metrics.reports24h}
          />
        </section>

        <section className="dashboard-grid">
          {/* Map Panel */}
          <div className="map-panel" id="map">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Risk geography & active surveillance</p>
                <h2>{scopeLabel}</h2>
              </div>
              <span>
                {activeLocations.filter((l) => ["HIGH", "CRITICAL"].includes(l.level)).length} high/critical zones in view
              </span>
            </div>

            <InteractiveRiskMap
              locations={activeLocations.length > 0 ? activeLocations : locations}
              onSelectLocationForSimulator={setSelectedSimLocationId}
            />
          </div>

          {/* Alerts Panel */}
          <div className="alerts-panel" id="alerts">
            <div className="panel-heading compact">
              <div>
                <p className="section-kicker">Alert queue</p>
                <h2>PHC Action List ({scopeLabel})</h2>
              </div>
            </div>
            <div className="alert-list">
              {filteredAlerts.length ? (
                filteredAlerts.map((alert) => (
                  <article className="alert-row" key={alert.id}>
                    <div>
                      <div className="pill-row">
                        <span className={priorityClass[alert.priority]}>{alert.priority}</span>
                        <span className={warningClass[alert.warningLevel]}>{alert.warningLevel.replace("_", " ")}</span>
                        <span className={levelClass[alert.level]}>{alert.level.toLowerCase()}</span>
                      </div>
                      <h3>{alert.title}</h3>
                      <p>{alert.message}</p>
                      <small>
                        {alert.location.name} · score {alert.score}/100 · confidence {alert.confidence}/100 ·{" "}
                        {formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })}
                      </small>
                      <small className="action-note">{alert.recommendedAction}</small>
                    </div>
                    <form action={alert.status === "OPEN" ? acknowledgeAlert : resolveAlert}>
                      <input type="hidden" name="alertId" value={alert.id} />
                      <button className="mini-button">{alert.status === "OPEN" ? "Acknowledge" : "Resolve"}</button>
                    </form>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  No open alerts for {scopeLabel}. Surveillance is clean.
                </div>
              )}
            </div>
          </div>

          {/* Explainable Intelligence Score Panel */}
          <div className="score-panel">
            <div className="panel-heading compact">
              <div>
                <p className="section-kicker">Explainable intelligence</p>
                <h2>Risk · confidence · warning · priority</h2>
              </div>
            </div>
            <div className="score-list">
              {filteredScores.length ? (
                filteredScores.map((score) => {
                  const factors = (score.factors ?? {}) as Record<string, number>;
                  const syndrome =
                    score.dominantSyndrome && score.dominantSyndrome !== "none"
                      ? score.dominantSyndrome.replace(/_/g, " ")
                      : null;
                  return (
                    <article className="score-row" key={score.id}>
                      <div className="score-topline">
                        <strong>{score.location.name}</strong>
                        <div className="pill-row">
                          <span className={warningClass[score.warningLevel]}>{score.warningLevel.replace("_", " ")}</span>
                          <span className={priorityClass[score.priority]}>{score.priority}</span>
                          <span className={levelClass[score.level]}>{score.score}/100</span>
                        </div>
                      </div>
                      <p className="score-meta">
                        confidence {score.confidence}/100 · {syndrome ? `dominant ${syndrome}` : "no dominant syndrome"}
                      </p>
                      <p>{score.reasoning}</p>
                      <div className="factor-bars">
                        {FACTOR_LABELS.map(([factor, label]) => (
                          <span key={factor}>
                            <i style={{ width: `${Math.min(100, Number(factors[factor] ?? 0) * 100)}%` }} />
                            {label} · {Math.round(Number(factors[factor] ?? 0) * 100)}%
                          </span>
                        ))}
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="empty-state">No score intelligence logged for {scopeLabel}.</div>
              )}
            </div>
          </div>

          {/* Water Intelligence Panel */}
          <div className="water-panel">
            <div className="panel-heading compact">
              <div>
                <p className="section-kicker">Water intelligence</p>
                <h2>Source-level monitoring ({scopeLabel})</h2>
              </div>
            </div>
            <div className="alert-list">
              {filteredWater.length ? (
                filteredWater.map((entry) => (
                  <article className="water-row" key={entry.id}>
                    <div className="score-topline">
                      <strong>{entry.name}</strong>
                      <span className={`level ${levelForWarning(entry.warningLevel)}`}>{entry.waterRisk}/100</span>
                    </div>
                    <p>
                      {entry.locationName} · {entry.type.toLowerCase().replace("_", " ")} · {entry.status.toLowerCase()}
                    </p>
                    <small>
                      {entry.turbidityNTU != null ? `tur ${entry.turbidityNTU} NTU` : "no turbidity"} ·{" "}
                      {entry.freeChlorine != null ? `Cl ${entry.freeChlorine} mg/L` : "no chlorine"} ·{" "}
                      {entry.ecoliDetected == null ? "no microbial test" : entry.ecoliDetected ? "E. coli positive" : "E. coli negative"} ·{" "}
                      {entry.inspectionScore != null ? `inspection ${entry.inspectionScore}/100` : "not inspected"} ·{" "}
                      {entry.rainfallMm72h}mm rain/72h
                    </small>
                    {entry.warningLevel !== "NORMAL" ? <em className="water-reason">{entry.reasons[0]}</em> : null}
                  </article>
                ))
              ) : (
                <div className="empty-state">No monitored water sources registered in {scopeLabel}.</div>
              )}
            </div>
          </div>

          {/* Incoming Reports Feed */}
          <div className="feed-panel">
            <div className="panel-heading compact">
              <div>
                <p className="section-kicker">Incoming reports</p>
                <h2>Case signal feed ({scopeLabel})</h2>
              </div>
            </div>
            <div className="feed-list">
              {filteredReports.length ? (
                filteredReports.map((report) => {
                  const signal = report.syndromeSignal as { syndrome?: string; percent?: number } | null;
                  return (
                    <article className="feed-row" key={report.id}>
                      <Droplets size={16} />
                      <div>
                        <strong>{report.location.name}</strong>
                        <span>
                          {report.symptoms.join(", ")} · severity {report.severity} ·{" "}
                          {formatDistanceToNow(new Date(report.reportedAt), { addSuffix: true })}
                        </span>
                        {signal?.syndrome ? (
                          <span className={`feed-syndrome ${signal.syndrome.replace("_", "-")}`}>
                            {signal.syndrome.replace(/_/g, " ")} {signal.percent != null ? `${Math.round(signal.percent)}%` : ""}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="empty-state">No recent symptom reports recorded in {scopeLabel}.</div>
              )}
            </div>
          </div>

          {/* What-If Simulator with Dynamic Location Support */}
          <WhatIfSimulator
            locationId={targetLocationId}
            locations={rawLocations.map((loc) => ({ id: loc.id, name: loc.name, district: loc.district }))}
          />

          {/* Scenario Runner with Dynamic Location Support */}
          <ScenarioRunner
            locationId={targetLocationId}
            locations={rawLocations.map((loc) => ({ id: loc.id, name: loc.name, district: loc.district }))}
          />

          {/* Symptom Intake Form */}
          <div id="intake">
            <ReportForm
              locations={rawLocations.map((loc) => ({
                id: loc.id,
                name: loc.name,
                waterSources: loc.waterSources,
              }))}
            />
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
