"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { submitManualReport, type ActionState } from "../actions";

type LocationOption = {
  id: string;
  name: string;
  waterSources: { id: string; name: string }[];
};

const initialState: ActionState = { ok: true, message: "" };
const symptoms = [
  "diarrhoea",
  "vomiting",
  "fever",
  "stomach_pain",
  "dehydration",
  "jaundice",
  "rash",
  "headache",
  "weakness",
  "fatigue",
  "nausea",
  "body_ache",
  "loss_of_appetite",
];

export function ReportForm({ locations }: { locations: LocationOption[] }) {
  const [state, action, pending] = useActionState(submitManualReport, initialState);

  return (
    <form action={action} className="control-panel">
      <div className="section-kicker">Manual intake</div>
      <div className="form-grid">
        <label>
          Location
          <select name="locationId" required defaultValue={locations[0]?.id}>
            {locations.map((location) => (
              <option value={location.id} key={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Water source
          <select name="waterSourceId" defaultValue="">
            <option value="">Unknown or not shared</option>
            {locations.flatMap((location) =>
              location.waterSources.map((source) => (
                <option value={source.id} key={source.id}>
                  {location.name} - {source.name}
                </option>
              )),
            )}
          </select>
        </label>

        <label>
          Reporter
          <input name="reporterName" placeholder="ASHA or citizen name" maxLength={90} />
        </label>

        <label>
          Age band
          <select name="ageBand" defaultValue="15-45">
            {["0-5", "6-14", "15-45", "46-65", "65+"].map((age) => (
              <option value={age} key={age}>
                {age}
              </option>
            ))}
          </select>
        </label>

        <label>
          Onset
          <input name="onsetAt" type="datetime-local" required defaultValue={new Date().toISOString().slice(0, 16)} />
        </label>

        <label>
          Severity
          <input name="severity" type="range" min="1" max="5" defaultValue="2" />
        </label>
      </div>

      <fieldset>
        <legend>Symptoms</legend>
        <div className="symptom-grid">
          {symptoms.map((symptom) => (
            <label className="check-tile" key={symptom}>
              <input type="checkbox" name="symptoms" value={symptom} defaultChecked={symptom === "diarrhoea"} />
              <span>{symptom.replace("_", " ")}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        Notes
        <textarea name="notes" rows={3} placeholder="Shared meal, water source, school cluster, or field observation" />
      </label>

      {state.message ? <p className={state.ok ? "form-note good" : "form-note bad"}>{state.message}</p> : null}

      <button className="primary-button" disabled={pending}>
        <Send size={17} />
        {pending ? "Submitting" : "Submit report"}
      </button>
    </form>
  );
}
