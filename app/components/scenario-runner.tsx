"use client";

import { useState, useTransition } from "react";
import { FlaskConical } from "lucide-react";
import { runSimulationScenarioAction, type ScenarioActionState } from "../actions";
import { SCENARIOS, type ScenarioId } from "@/lib/simulation-presets";

const initialState: ScenarioActionState = { ok: true, message: "" };

export function ScenarioRunner({
  locationId,
  locations = [],
}: {
  locationId?: string;
  locations?: { id: string; name: string; district: string }[];
}) {
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const currentLocId = selectedLocId ?? locationId ?? locations[0]?.id;
  const [scenario, setScenario] = useState<ScenarioId>("TRUE_OUTBREAK");
  const [state, setState] = useState<ScenarioActionState>(initialState);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setState(initialState);
    startTransition(async () => {
      setState(await runSimulationScenarioAction({ scenario, locationId: currentLocId }));
    });
  };

  const meta = SCENARIOS[scenario];

  return (
    <div className="control-panel">
      <div className="section-kicker">Scenario runner</div>
      <p className="scenario-description">{meta.description}</p>

      {locations.length > 0 && (
        <label className="sim-slider">
          <span>
            Target Location
            <em>{locations.find((l) => l.id === currentLocId)?.name ?? "Select zone"}</em>
          </span>
          <select
            value={currentLocId ?? ""}
            onChange={(event) => setSelectedLocId(event.target.value)}
            className="location-select-box"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.district})
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="sim-slider">
        <span>
          Scenario
          <em>{meta.expected}</em>
        </span>
        <select value={scenario} onChange={(event) => setScenario(event.target.value as ScenarioId)}>
          {(Object.keys(SCENARIOS) as ScenarioId[]).map((key) => (
            <option value={key} key={key}>
              {SCENARIOS[key].label}
            </option>
          ))}
        </select>
      </label>

      <button className="primary-button" onClick={run} disabled={pending}>
        <FlaskConical size={17} />
        {pending ? "Injecting synthetic data" : "Apply scenario to live system"}
      </button>

      {state.message ? <p className={state.ok ? "form-note good" : "form-note bad"}>{state.message}</p> : null}

      {state.output ? (
        <div className="sim-result">
          <div className="sim-result-topline">
            <strong>
              {state.output.score}/100 <span className={`level ${state.output.level.toLowerCase()}`}>{state.output.level.toLowerCase()}</span>
            </strong>
            <span className={`warning-pill ${warningColorFor(state.output.warningLevel) ?? "normal"}`}>{state.output.warningLevel.toLowerCase()}</span>
            <span className={`priority-pill p${state.output.priority.replace("P", "")}`}>{state.output.priority}</span>
          </div>
          <p>
            Confidence {state.output.confidence}/100
          </p>
          <ul className="reason-list">
            {state.output.reasons.slice(0, 5).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function warningColorFor(warning: string) {
  if (warning === "OUTBREAK") return "critical";
  if (warning === "EARLY_WARNING") return "high";
  if (warning === "WATCH") return "moderate";
  return "normal";
}