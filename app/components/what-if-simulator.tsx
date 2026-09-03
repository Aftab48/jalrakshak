"use client";

import { useState, useTransition, useEffect } from "react";


import { Play, Sparkles } from "lucide-react";
import { simulateWhatIfAction } from "../actions";
import {
  DEFAULT_WHAT_IF,
  SCENARIOS,
  SCENARIO_PRESETS,
  type ScenarioId,
  type WhatIfAdjustments,
} from "@/lib/simulation-presets";

type WhatIfResult = {
  score: number;
  level: string;
  warningLevel: string;
  warningIndex: number;
  confidence: number;
  priority: string;
  priorityScore: number;
  factors: Record<string, number>;
  syndrome: string | null;
  syndromePercent: number | null;
  reasons: string[];
  recommendedAction: string[];
  confidenceBreakdown: Record<string, number>;
};

function asNumber(value: string, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : min;
}

export function WhatIfSimulator({
  locationId,
  locations = [],
  syncKey,
}: {
  locationId?: string;
  locations?: { id: string; name: string; district: string }[];
  syncKey?: number;
}) {
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const currentLocId = selectedLocId ?? locationId ?? locations[0]?.id;

  // When the parent-supplied locationId changes (global scope switch or map
  // selection), discard the stale local override so the prop takes effect.
  useEffect(() => {
    setSelectedLocId(null);
  }, [locationId, syncKey]);
  const [preset, setPreset] = useState<ScenarioId | "CUSTOM">("CUSTOM");
  const [adjustments, setAdjustments] = useState<WhatIfAdjustments>({ ...DEFAULT_WHAT_IF });
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const applyPreset = (scenario: ScenarioId | "CUSTOM") => {
    setPreset(scenario);
    if (scenario === "CUSTOM") return;
    setAdjustments({ ...SCENARIO_PRESETS[scenario] });
  };

  const update = <K extends keyof WhatIfAdjustments>(key: K, value: WhatIfAdjustments[K]) => {
    setPreset("CUSTOM");
    setAdjustments((current) => ({ ...current, [key]: value }));
  };

  const project = () => {
    setError(null);
    startTransition(async () => {
      const state = await simulateWhatIfAction({ ...adjustments, locationId: currentLocId });
      if (state.ok && state.result) {
        setResult(state.result);
      } else {
        setError(state.message);
      }
    });
  };

  const factorList = [
    ["diseaseSignal", "Syndrome match"],
    ["anomaly", "Anomaly vs baseline"],
    ["growth", "24h growth"],
    ["water", "Water quality"],
    ["environmental", "Rainfall"],
    ["spatial", "Spatial cluster"],
    ["vulnerability", "Vulnerability"],
    ["exposure", "Population exposure"],
  ] as const;

  return (
    <div className="control-panel">
      <div className="section-kicker">What-if simulator</div>

      <div className="scenario-grid">
        {(Object.keys(SCENARIOS) as ScenarioId[]).map((scenario) => (
          <button
            type="button"
            key={scenario}
            className={preset === scenario ? "scenario-chip active" : "scenario-chip"}
            onClick={() => applyPreset(scenario)}
          >
            <Sparkles size={13} />
            {SCENARIOS[scenario].label}
          </button>
        ))}
        <button
          type="button"
          className={preset === "CUSTOM" ? "scenario-chip custom active" : "scenario-chip custom"}
          onClick={() => applyPreset("CUSTOM")}
        >
          Custom
        </button>
      </div>

      {locations.length > 0 && (
        <label className="sim-slider">
          <span>
            Target Location
            <em>{locations.find((l) => l.id === currentLocId)?.name ?? "Select zone"}</em>
          </span>
          <select
            value={currentLocId ?? ""}
            onChange={(e) => setSelectedLocId(e.target.value)}
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

      <div className="sim-sliders">
        <SimSlider
          label="Rainfall in 72h"
          hint={`${Math.round(adjustments.rainfallMm72h)} mm`}
          value={adjustments.rainfallMm72h}
          min={0}
          max={150}
          step={2}
          onChange={(value) => update("rainfallMm72h", asNumber(value, 0, 150))}
        />
        <SimSlider
          label="Case spike × baseline"
          hint={`${adjustments.symptomIncrease}× today`}
          value={adjustments.symptomIncrease}
          min={0}
          max={6}
          step={0.1}
          onChange={(value) => update("symptomIncrease", asNumber(value, 0, 6))}
        />
        <SimSlider
          label="24h report growth"
          hint={`${Math.round(adjustments.growthRate * 100)}%`}
          value={adjustments.growthRate}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => update("growthRate", asNumber(value, 0, 1))}
        />
        <SimSlider
          label="Water contamination"
          hint={`${Math.round(adjustments.waterContamination * 100)}%`}
          value={adjustments.waterContamination}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => update("waterContamination", asNumber(value, 0, 1))}
        />
        <SimSlider
          label="Population vulnerability"
          hint={`${Math.round(adjustments.populationVulnerability * 100)}%`}
          value={adjustments.populationVulnerability}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => update("populationVulnerability", asNumber(value, 0, 1))}
        />
        <SimSlider
          label="Spatial clustering"
          hint={adjustments.spatialStrength >= 0.6 ? "Tight cluster" : adjustments.spatialStrength > 0 ? "Scattered" : "None"}
          value={adjustments.spatialStrength}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => update("spatialStrength", asNumber(value, 0, 1))}
        />
      </div>

      <label className="toggle-line">
        <input
          type="checkbox"
          checked={adjustments.ecoliPositive}
          onChange={(event) => update("ecoliPositive", event.target.checked)}
        />
        E. coli positive sample
      </label>

      <button className="primary-button" onClick={project} disabled={pending || !currentLocId}>
        <Play size={17} />
        {pending ? "Projecting" : "Run projection"}
      </button>

      {!currentLocId ? (
        <p className="form-note bad">No monitored location in this scope — select a different region to run a projection.</p>
      ) : null}

      {error ? <p className="form-note bad">{error}</p> : null}

      {result ? <ResultCard result={result} factorList={factorList} /> : null}
    </div>
  );

  function ResultCard({
    result,
    factorList,
  }: {
    result: WhatIfResult;
    factorList: readonly (readonly [string, string])[];
  }) {
    const warningColor = warningColorFor(result.warningLevel);
    return (
      <div className="sim-result">
        <div className="sim-result-topline">
          <strong>
            {result.score}/100 <span className={`level ${result.level.toLowerCase()}`}>{result.level.toLowerCase()}</span>
          </strong>
          <span className={`warning-pill ${warningColor ?? "normal"}`}>{result.warningLevel.toLowerCase()}</span>
          <span className={`priority-pill p${result.priority.replace("P", "")}`}>{result.priority}</span>
        </div>
        <p>
          Confidence {result.confidence}/100 · {result.syndrome ? `dominant ${result.syndrome.replace(/_/g, " ")} (${result.syndromePercent}%)` : "no dominant syndrome"}
        </p>
        <div className="factor-bars">
          {factorList.map(([key, label]) => (
            <span key={key}>
              <i style={{ width: `${Math.min(100, (result.factors[key] ?? 0) * 100)}%` }} />
              {label} · {Math.round((result.factors[key] ?? 0) * 100)}%
            </span>
          ))}
        </div>
        <ul className="reason-list">
          {(result.reasons ?? []).slice(0, 6).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <small className="action-note">Recommended → {result.recommendedAction?.slice(0, 2).join(" · ") ?? "no action"}</small>
      </div>
    );
  }
}

function SimSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (raw: string) => void;
}) {
  return (
    <label className="sim-slider">
      <span>
        {label}
        <em>{hint}</em>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function warningColorFor(warning: string) {
  if (warning === "OUTBREAK") return "critical";
  if (warning === "EARLY_WARNING") return "high";
  if (warning === "WATCH") return "moderate";
  return "normal";
}