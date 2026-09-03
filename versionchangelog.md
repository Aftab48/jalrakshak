# JalRakshak Version Changelog

## 0.2.0 — Explainable Early-Warning Engine (current)

The static six-factor risk score from 0.1.0 is replaced by a modular, explainable early-warning pipeline. The headline change: **risk is decoupled from evidence confidence**, and the two are combined into an alert priority (P0–P3). This makes the system safer against duplicate-report floods (high risk but low confidence → never P0) and more informative (a contaminated-source signal with moderate evidence still surfaces as an early warning).

### Breaking changes (from 0.1.0)

- `RiskScore` / `Alert` gains `confidence`, `warningLevel`, `priority`, `dominantSyndrome`, `rawMetrics`; the old flat 6-factor breakdown is superseded by an 8-factor output (disease signal, anomaly, growth, water, environmental, spatial, vulnerability, exposure).
- The 0.1.0 sequence-based outbreak "simulation" (inject a fixed 9-case spike into one hard-coded target location) is gone. It is replaced by 8 reusable **scenario contracts** that run the real engine on synthetic inputs and are verified automatically.
- Phone hashing changed from plain SHA-256 to **HMAC-SHA256 keyed pseudonymisation** (secret: `PHONE_HASH_SECRET` or falls back to `INTERNAL_API_KEY`). Hashes are now keyed, so output is no longer directly comparable to 0.1.0.

### Added

- **Engines** (`lib/`):
  - `anomaly-engine.ts` — rolling 14-day z-score baseline (with a floor so tiny counts still flag) → NORMAL/WATCH/EARLY_WARNING/STRONG_ANOMALY.
  - `disease-engine.ts` — 3 syndrome profiles (acute diarrheal / typhoid-like / hepatitis-like) over 13 canonical symptoms → dominant syndrome + percent.
  - `water-risk-engine.ts` — WHO-inspired thresholds on turbidity · free chlorine · E. coli · pH · TDS · inspection score · rainfall interaction → `waterRisk` 0–100.
  - `spatial-engine.ts` — greedy Haversine-distance clustering on the **72h report window** → cluster strength in affected households.
  - `confidence-engine.ts` — evidence-quality score (report count/uniqueness, data-source coverage, duplicate penalty) independent of risk.
  - `alert-priority-engine.ts` — P0/P1/P2/P3 via a product-of-factors model (risk × confidence × exposure × vulnerability × growth).
  - `early-warning-engine.ts` — weighted `warningIndex` → NORMAL/WATCH/EARLY_WARNING/OUTBREAK, with a low-confidence cap.
  - `early-warning-types.ts`, `syndromes.ts` — shared types and the risk-profile/weights tables.
  - `simulation-engine.ts` + `simulation-presets.ts` — 8 scenario presets and `simulateWhatIf` / `runScenarioChecks`; `simulation-presets.ts` is a pure-data module shared server-side and client-side.
  - `voice-intake.ts` — language-aware mock voice adapter (8 Indian languages) with a `parseVoiceReport` contract ready to swap in a real ASR + NLU service.
- **Simulation & testing**:
  - 8 scenario contracts (`TRUE_OUTBREAK`, `HEAVY_RAIN_ONLY`, `WATER_CONTAMINATION_ONLY`, `SEASONAL_INCREASE`, `DUPLICATE_REPORT_ATTACK`, `SENSOR_DATA_FAILURE`, `HIDDEN_OUTBREAK`, `MULTIPLE_HOTSPOTS`).
  - `scripts/run-simulation.ts` (`npm run simulate`) validates all 8 against the real engine.
  - `tests/engines.test.ts` + `npm test` — 13 engine + scenario contracts, run with `node --import tsx --test`.
- **Database** (`prisma/schema.prisma`):
  - `WaterQualityObservation` model (`sampleMethod`, `confidence`).
  - `WaterSource.lastInspectedAt` / `notes`.
  - `SymptomReport.syndromeSignal` (JSONB).
  - `RiskScore.confidence` / `warningLevel` / `priority` / `dominantSyndrome` / `rawMetrics`.
  - `Alert.priority` / `confidence` / `warningLevel`.
  - New enums: `WarningLevel`, `AlertPriority`, `SampleMethod`.
- **Dashboard V2** (`app/page.tsx`, `app/globals.css`):
  - Warning-ringed map markers, P0–P3 alert queue, 7-factor risk panel with confidence/warning/priority, water-intelligence panel (turbidity/chlorine/E. coli/inspection), syndrome-tagged case feed.
  - `app/components/what-if-simulator.tsx` — sliders + scenario presets drive the real engine via `simulateWhatIfAction`.
  - `app/components/scenario-runner.tsx` — injects synthetic records into the live system via `runSimulationScenarioAction`.
- **Server actions** (`app/actions.ts`): `simulateWhatIfAction`, `runSimulationScenarioAction`, `submitWaterQualityObservation`.
- **Seed expansion** (`prisma/seed.ts`): 60-day rainfall, 45–90-day case logs with true per-day timestamps and tight coordinate clustering, typed water sources, weekly lab + recent field-test water-quality panels, sensor-gap locations, per-location syndrome signals, and a per-location model-output summary printed after recalculation.
- **API enrichment** (`app/api/risk/recalculate/route.ts`): returns confidence, warning level, priority, dominant syndrome, warning index, factors, raw metrics, confidence breakdown, reasons, recommended action, reasoned text.
- **Docs**: V2 section in `info.md`; this changelog.

### Changed

- Report-form symptoms synced to the 13 canonical codes; the Twilio WhatsApp/IVR keyword parser expanded/normalized to the same 13 codes.
- What-if adjustment schema extended: `noRainfallEvidence`, `noWaterEvidence`, `uniquePhones` (1–20), `historyScale` (0.5–4).
- Risk weights are configurable per-dominant-syndrome via `RISK_PROFILES` (prototype starting values — not clinically validated coefficients).
- Warning-level gating: OUTBREAK from water signals now requires multi-signal confirmation (water ≥ 70 && trend ≥ 0.5 && warningIndex ≥ 0.6).

### Fixed

- **Confidence inflation**: unique reporters were counted outside the 72h evidence window; both `reportCount72h` and `uniqueReporterCount` are now computed from the same 72h subset.
- **Seed timestamps** (latest fix, discovered during live verification): `reportedAt` was computed but never set on the pushed `SymptomReport` row, so every report fell back to the column default and all cases collapsed into a single simultaneous 24h "outbreak". `reportedAt` is now written explicitly, producing a correct 45–90-day time spread and a meaningful risk spread across seed patterns.
- **Seasonality**: a smooth seasonal doubling now reads as `WATCH`/`NORMAL` instead of `OUTBREAK` (rolling baseline + `historyScale`).
- **Spatial clustering**: now operates on the 72h incident window (recent clusters), and `estimatedExposedPopulation` uses unique 72h reporters.
- **Simulation determinism**: `simulateWhatIf` and the scenario checks now use a seeded PRNG (`mulberry32`, seed `SIMULATION_SEED` default 1, folded with the day-of-year), so results are stable across runs instead of jitter-dependent.

### Verification

- `npx tsc --noEmit` — passes.
- `npm run lint` — 0 errors, 0 warnings.
- `npm test` — 13/13 pass.
- `npm run simulate` — 8/8 scenario contracts pass (deterministic).
- `next build` — succeeds; `/` remains server-rendered (dynamic) on demand.
- `npm run db:push` / `npm run db:seed` — now verified end-to-end against a local PostgreSQL (Postgres 18.6 via `initdb`/`pg_ctl` in the sandbox; no Docker available). The seed produces a realistic spread, e.g.:

```
Baksara Ward 4        EARLY_WARNING HIGH      74  conf 81 P1
Santragachi Cluster   WATCH         MODERATE  38  conf 75 P3
Kadamtala Ward 9      OUTBREAK      CRITICAL  78  conf 71 P0
Bijoygarh Block       EARLY_WARNING HIGH      61  conf 91 P2
Jadavpur East         WATCH         MODERATE  36  conf 80 P3
Salt Lake Sector 3    EARLY_WARNING MODERATE  50  conf 72 P2
Maheshtala River Belt OUTBREAK      CRITICAL  83  conf 76 P0
Uluberia Rural Pocket OUTBREAK      CRITICAL  76  conf 87 P0
```

- Full-stack smoke test: `next dev` renders the dashboard with live DB data (warning-ringed markers, P0–P3 queue, what-if + scenario panels); `POST /api/risk/recalculate` returns the complete explainable payload against seeded data; `runSimulationScenario` writes synthetic records and returns a correct `OUTBREAK 93 / P0`.

---

## 0.1.0 — Baseline prototype (previous)

A working single-page command center built on the same stack (Next.js App Router, Prisma, Zod) that established the intake → risk → alert → dashboard loop.

### Added

- Multi-channel report intake — WhatsApp (Twilio form post), IVR, dashboard manual form, and `POST /api/reports` — with Zod validation and audit logging.
- In-memory rate limiting (30 req/min/IP), hashed phone numbers (SHA-256 at this version), Twilio HMAC signature validation, `x-internal-api-key` guard on internal routes.
- A static six-factor explainable risk score (symptom cluster + growth rate + rainfall + water-source risk + recency + vulnerability − duplicate penalty) → 0–100 with level, reasoning, and a recommended field action.
- Threshold-based alerting (≥ 55 HIGH/CRITICAL) into a PHC action queue with acknowledge/resolve states.
- A server-rendered dashboard (`app/page.tsx`) with risk map, metric strip, alert queue, risk-score factor bars, case feed, and a manual intake form.
- Seeded synthetic data for 8 Howrah–Kolkata locations (water sources, rainfall, symptom reports).
- A sequence-based outbreak simulation script that injected a fixed 9-case spike into one target location and verified sensitivity/control/explainability.

### Notes for migration

Data seeded by 0.1.0 is compatible with the 0.2.0 schema after `db:push` (new columns are additive / nullable, and the new enums only appear on new rows). Re-running `db:seed` is recommended so the demo data has correct 45–90-day timestamps and the full V2 explainable fields.