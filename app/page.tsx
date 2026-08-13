import { formatDistanceToNow } from "date-fns";
import { Activity, Bell, Droplets, MapPin, RefreshCw, ShieldCheck } from "lucide-react";
import { acknowledgeAlert, recalculateRiskAction, resolveAlert } from "./actions";
import { ReportForm } from "./components/report-form";
import { getDashboardData } from "@/lib/services";

export const dynamic = "force-dynamic";

const levelClass: Record<string, string> = {
  LOW: "level low",
  MODERATE: "level moderate",
  HIGH: "level high",
  CRITICAL: "level critical",
};

export default async function Home() {
  const data = await getDashboardData();

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
            <h1>Waterborne outbreak early-warning for wards and villages.</h1>
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
          <Metric icon={<Bell size={18} />} label="Active alerts" value={data.metrics.activeAlerts} />
          <Metric icon={<ShieldCheck size={18} />} label="Critical zones" value={data.metrics.criticalCount} />
          <Metric icon={<Activity size={18} />} label="Reports in feed" value={data.reports.length} />
        </section>

        <section className="dashboard-grid">
          <div className="map-panel" id="map">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Risk geography</p>
                <h2>Howrah and Kolkata pilot belt</h2>
              </div>
              <span>{data.metrics.highCount + data.metrics.criticalCount} zones need verification</span>
            </div>

            <div className="risk-map">
              {data.locations.map((location, index) => {
                const score = data.latestByLocation.get(location.id);
                const level = score?.level ?? "LOW";
                return (
                  <article className={`map-cell ${level.toLowerCase()}`} key={location.id} style={{ "--i": index } as React.CSSProperties}>
                    <span>{location.type.toLowerCase()}</span>
                    <strong>{location.name}</strong>
                    <b>{score?.score ?? 0}</b>
                  </article>
                );
              })}
            </div>
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
                      <span className={levelClass[alert.level]}>{alert.level.toLowerCase()}</span>
                      <h3>{alert.title}</h3>
                      <p>{alert.message}</p>
                      <small>{alert.recommendedAction}</small>
                    </div>
                    <form action={alert.status === "OPEN" ? acknowledgeAlert : resolveAlert}>
                      <input type="hidden" name="alertId" value={alert.id} />
                      <button className="mini-button">{alert.status === "OPEN" ? "Acknowledge" : "Resolve"}</button>
                    </form>
                  </article>
                ))
              ) : (
                <div className="empty-state">No active alerts. Surveillance is still running.</div>
              )}
            </div>
          </div>

          <div className="score-panel">
            <div className="panel-heading compact">
              <div>
                <p className="section-kicker">Explainable scoring</p>
                <h2>Latest risk factors</h2>
              </div>
            </div>
            <div className="score-list">
              {data.latestScores.map((score) => {
                const factors = score.factors as Record<string, number>;
                return (
                  <article className="score-row" key={score.id}>
                    <div className="score-topline">
                      <strong>{score.location.name}</strong>
                      <span className={levelClass[score.level]}>{score.score}/100</span>
                    </div>
                    <p>{score.reasoning}</p>
                    <div className="factor-bars">
                      {["symptomCluster", "growthRate", "rainfall", "waterSource", "recency"].map((factor) => (
                        <span key={factor}>
                          <i style={{ width: `${Math.min(100, Number(factors[factor] ?? 0) * 3)}%` }} />
                          {factor.replace(/([A-Z])/g, " $1")}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
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
              {data.reports.map((report) => (
                <article className="feed-row" key={report.id}>
                  <Droplets size={16} />
                  <div>
                    <strong>{report.location.name}</strong>
                    <span>
                      {report.symptoms.join(", ")} · severity {report.severity} ·{" "}
                      {formatDistanceToNow(report.reportedAt, { addSuffix: true })}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>

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

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
