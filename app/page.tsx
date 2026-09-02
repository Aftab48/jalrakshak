import { formatDistanceToNow } from "date-fns";
import { Activity, Bell, Droplets, MapPin, RefreshCw, ShieldAlert } from "lucide-react";
import { acknowledgeAlert, recalculateRiskAction, resolveAlert } from "./actions";
import { InteractiveRiskMap, type PlottedLocation } from "./components/interactive-risk-map";
import { ReportForm } from "./components/report-form";
import { WhatIfSimulator } from "./components/what-if-simulator";
import { ScenarioRunner } from "./components/scenario-runner";
import { getDashboardData } from "@/lib/services";

export const dynamic = "force-dynamic";

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

function levelForWarning(warning: string) {
  if (warning === "OUTBREAK") return "critical";
  if (warning === "EARLY_WARNING") return "high";
  if (warning === "WATCH") return "moderate";
  return "low";
}

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
        <header className="topbar">
          <div>
            <p className="eyebrow">JalRakshak command center</p>
            <h1>Early-warning for waterborne outbreaks.</h1>
            <p className="topbar-sub">
              Risk scores are separated from evidence confidence; alert priority blends both.
            </p>
          </div>
          <form action={recalculateRiskAction}>
            <button className="ghost-button">
              <RefreshCw size={16} />
              Recalculate
            </button>
          </form>
        </header>

        <section className="metric-strip" aria-label="Overview metrics">
          <Metric icon={<MapPin size={18} />} label="Locations monitored" value={data.metrics.monitoredLocations} />
          <Metric icon={<ShieldAlert size={18} />} label="Active warnings" value={data.metrics.watchCount + data.metrics.earlyWarningsCount} />
          <Metric icon={<Bell size={18} />} label="Open alerts" value={data.metrics.activeAlerts} />
          <Metric icon={<Activity size={18} />} label="Reports in 24h" value={data.metrics.reports24h} />
        </section>

        <section className="dashboard-grid">
          <div className="map-panel" id="map">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Risk geography & active surveillance</p>
                <h2>Howrah and Kolkata pilot belt</h2>
              </div>
              <span>{data.metrics.highCount + data.metrics.criticalCount} zones need verification</span>
            </div>

            <InteractiveRiskMap locations={plottedLocations} />
          </div>

          <div className="alerts-panel" id="alerts">
            <div className="panel-heading compact">
              <div>
                <p className="section-kicker">Alert queue</p>
                <h2>PHC action list</h2>
              </div>
            </div>
            <div className="alert-list">
              {data.openAlerts.length ? (
                data.openAlerts.map((alert) => (
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
                        {formatDistanceToNow(alert.triggeredAt, { addSuffix: true })}
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
                <div className="empty-state">No open alerts. Surveillance is still running.</div>
              )}
            </div>
          </div>

          <div className="score-panel">
            <div className="panel-heading compact">
              <div>
                <p className="section-kicker">Explainable intelligence</p>
                <h2>Risk · confidence · warning · priority</h2>
              </div>
            </div>
            <div className="score-list">
              {data.latestScores.map((score) => {
                const factors = score.factors as Record<string, number>;
                const syndrome = score.dominantSyndrome && score.dominantSyndrome !== "none" ? score.dominantSyndrome.replace(/_/g, " ") : null;
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
              })}
            </div>
          </div>

          <div className="water-panel">
            <div className="panel-heading compact">
              <div>
                <p className="section-kicker">Water intelligence</p>
                <h2>Source-level monitoring</h2>
              </div>
            </div>
            <div className="alert-list">
              {data.waterIntelligence.map((entry) => (
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
              ))}
            </div>
          </div>

          <div className="feed-panel">
            <div className="panel-heading compact">
              <div>
                <p className="section-kicker">Incoming reports</p>
                <h2>Case signal feed</h2>
              </div>
            </div>
            <div className="feed-list">
              {data.reports.map((report) => {
                const signal = report.syndromeSignal as { syndrome?: string; percent?: number } | null;
                return (
                  <article className="feed-row" key={report.id}>
                    <Droplets size={16} />
                    <div>
                      <strong>{report.location.name}</strong>
                      <span>
                        {report.symptoms.join(", ")} · severity {report.severity} ·{" "}
                        {formatDistanceToNow(report.reportedAt, { addSuffix: true })}
                      </span>
                      {signal?.syndrome ? (
                        <span className={`feed-syndrome ${signal.syndrome.replace("_", "-")}`}>
                          {signal.syndrome.replace(/_/g, " ")} {signal.percent != null ? `${Math.round(signal.percent)}%` : ""}
                        </span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <WhatIfSimulator locationId={data.locations[0]?.id} />

          <ScenarioRunner locationId={data.locations[0]?.id} />

          <div id="intake">
            <ReportForm
              locations={data.locations.map((location) => ({
                id: location.id,
                name: location.name,
                waterSources: location.waterSources.map((source) => ({ id: source.id, name: source.name })),
              }))}
            />
          </div>
        </section>
      </section>
    </main>
  );
}

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


function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}