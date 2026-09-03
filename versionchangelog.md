# JalRakshak Version Changelog

## 0.3.0 — Interactive Geographic Surveillance & Dynamic Multi-Region Intelligence (current)

The static map schematic and single-location dashboard view from 0.2.0 are replaced by an interactive geographic surveillance experience and a global location/region coordinator. Key enhancements include **interactive pan/zoom map canvas with animated radar halos**, **rich 3-tab interactive location popups / inspector drawers**, and a **global location & district selector** that dynamically synchronizes all dashboard panels, metrics, what-if simulations, and synthetic scenario runners.

### Added

- **Interactive Risk Map & Inspector** (`app/components/interactive-risk-map.tsx`):
  - **Canvas Navigation**: Mouse drag-to-pan, touch pan, mouse-wheel zoom, and floating zoom controls (`+`, `-`, `Reset` with zoom percentage indicator).
  - **Layer Toggles**: Real-time layer switches for Geographic Roads & Rivers, Risk Radiation Halos, and Water Source Points.
  - **Interactive Map Markers**: Warning-ringed markers with live score badges, active alert indicator dots (`!`), and micro hover-cards displaying clinical reasoning and evidence confidence.
  - **Radar Radiation Waves**: SVG radial pulse animations on `OUTBREAK` and `EARLY_WARNING` zones to highlight active disease clusters.
  - **Interactive 3-Tab Location Inspector / Popup**:
    - *Risk & Syndromes*: Risk score gauge, warning level pill, alert priority, confidence score, dominant syndrome match, reasoning narrative, and 8-factor progress bars (Syndrome match, Anomaly vs baseline, 24h growth, Water quality, Rainfall, Spatial cluster, Vulnerability, Exposure).
    - *Water Quality Monitoring*: Source-level observations (turbidity NTU, free chlorine mg/L, E. coli positive/negative detection, sanitary inspection scores, and hazard reasons).
    - *Active Alerts & Inline Actions*: Location alerts queue with direct *Acknowledge* and *Resolve* action buttons.
    - *Quick Actions Bar*: Instant jump-to-report form prefill, jump-to-simulator, and recenter-on-map buttons.
- **Global Location & Multi-Region Coordinator** (`app/components/dashboard-view.tsx`):
  - **Topbar Location Selector**: Categorized dropdown supporting *All Pilot Belts*, *By District* (`Howrah`, `Kolkata`, `South 24 Parganas`), *By Specific Monitored Zone*, and *Other Regions* pre-configured for future datasets (`Delhi NCR`, `Mumbai Metropolitan`, `Bengaluru Urban`, `Patna District`, `Varanasi Ghats Pocket`, `Jaipur District`).
  - **District Quick-Filter Toolbar**: 1-click pill buttons for rapid geographic scope switching.
  - **Synchronized Dashboard Filtering**: Dynamically re-scopes the Overview Metrics Strip, Risk Map, Alert Queue, Explainable Intelligence Scores, Water Intelligence, and Case Reports Feed to the selected location or district.
  - **Future Region State**: Clean informational banner for unseeded regions indicating channel readiness for sensor ingestion and case reports.
- **Multi-Location Simulation Controls**:
  - `app/components/what-if-simulator.tsx` — Target Location selector dropdown allows running what-if risk projections on any monitored zone.
  - `app/components/scenario-runner.tsx` — Target Location selector dropdown allows injecting synthetic outbreak scenarios into any monitored zone.
- **Styles** (`app/globals.css`):
  - Added CSS for interactive map viewport (`cursor: grab/grabbing`), floating zoom controls, radar pulse keyframe animations, hover cards, popup inspector drawer, global location selector dropdown, and district quick-chips.

### Changed

- `app/page.tsx` — Refactored to pass server-fetched surveillance intelligence, water observations, open alerts, and clinical signals into `DashboardView`.
- `app/components/what-if-simulator.tsx` and `app/components/scenario-runner.tsx` — Synchronized with parent location selection while allowing manual target overrides.

### Fixed

- **React Compiler Purity**: Replaced render-time `Date.now()` with pure per-location `reportsCount24h` reduction in `DashboardView`.
- **State Synchronization**: Replaced effect-driven `setState` in simulation tools with pure derived state (`selectedLocId ?? locationId ?? default`).
- **Linter Cleanup**: Resolved unused variable warnings in `app/page.tsx` and `app/components/interactive-risk-map.tsx`.
- **Empty-Scope Target Leakage**: `targetLocationId` in `DashboardView` no longer falls back to the unfiltered location list when the active scope (e.g. an unseeded future region) has zero monitored locations — it now resolves to `undefined` instead of silently pointing at an unrelated real location. The What-If Simulator and Scenario Runner receive scope-filtered `locations` (not the raw full list) so their own internal fallback can no longer leak a real location either, and both now disable their Run/Apply buttons with an explicit "No monitored location in this scope" note instead of allowing a simulation to fire against the wrong target.

### Verification

- `npx tsc --noEmit` — passes with 0 errors.
- `npm run lint` — 0 errors, 0 warnings.
- `npm test` — 44/44 unit and contract tests pass.
- Git Branch — committed and pushed to `origin/raj`.

---

## 0.2.1 — Android Field-Worker App Layer (previous)

Adds a native offline-first Android companion app for field verification workers, plus the supporting API surface on the web side. Built on Kotlin + Jetpack Compose with a local Room database and background sync so field workers can capture data with no connectivity and have it flow to the server once back online.

### Added

- **Android app** (`android/`): Kotlin + Jetpack Compose field-worker app (`com.jalrakshak.field`) covering login, home dashboard, alert list/detail with in-app verification, water-source inspection capture, voice-based report intake (mock ASR service, ready to swap for a real one), report submission with photo capture/compression, and a sync-status/settings screen.
  - **Offline-first local storage**: Room database (`AppDatabase`) with DAOs/entities for alerts, health reports, water inspections, verifications, drafts, and a sync queue.
  - **Background sync**: `SyncEngine` / `SyncManager` / `SyncWorker` reconcile the local sync queue against the server once network connectivity returns (`NetworkMonitor`).
  - **Networking**: Retrofit-based `JalRakshakApi` client with auth and API-key interceptors, DTOs, and repository implementations mapping local/remote models.
- **Android-facing API routes** (`app/api/android/`): `auth/login`, `alerts`, `alerts/[id]`, `alerts/[id]/status`, `locations`, `locations/[id]`, `verifications`, `water-quality`, `water-sources`, `water-sources/[id]` — zod-validated endpoints backing the app's data sync.
- **Database** (`prisma/schema.prisma`): New `FieldVerification` model (case presence, affected people/households, symptoms, water source/condition, geo-coordinates, `verifiedBy`) linked to `Alert`, capturing field-worker verification submitted from the Android app.

### Fixed

- **Repo hygiene**: Removed committed Gradle build output (`android/app/build`, `android/build`, `android/.gradle`) and `.idea`/`local.properties` caches from tracking; added `android/.gitignore` plus root `.idea/` entry so IDE/build artifacts stay untracked going forward.
- **Vercel build failure**: `app/api/android/verifications/route.ts` narrowed its optional latitude/longitude guard from `!== undefined` to `!= null` (the zod schema's `.nullish()` fields could pass `null` through to `Prisma.Decimal`, which rejects it) and replaced a fragile per-call `await import("@prisma/client")` with a top-level import.

### Verification

- `npm run build` — succeeds on Vercel after the TypeScript fix.
- Git Branch — merged into `main` via PR #3.

---

## 0.2.0 — Explainable Early-Warning Engine (previous)

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