# JalRakshak

JalRakshak is a Next.js public-health command center for predicting waterborne outbreak risk from symptom clusters, rainfall, and water-source status.

## Architecture

Citizen and health-worker reports enter through `/api/reports`, dashboard server actions, or a Twilio WhatsApp/IVR form post. The app validates every payload with Zod, hashes phone numbers before storage, deduplicates repeat reports from the same phone/location window, recalculates the affected location, and opens a PHC alert when the explainable score crosses a threshold.

The stack is intentionally simple for a hackathon build:

- Next.js App Router for UI, backend routes, and server actions
- Prisma with Neon/PostgreSQL
- Zod validation on all intake surfaces
- A modular, **fully explainable** early-warning engine in `lib/` (anomaly, disease, water-risk, spatial, confidence, alert-priority, early-warning)
- Seeded synthetic monsoon, water-quality, and symptom data for a defensible demo
- A deterministic what-if simulator and 8 validated scenario contracts that run the real engine

## Data Model

Core tables:

- `Location`: ward/village metadata, baseline cases, vulnerability
- `WaterSource`: hand pumps, taps, wells, tankers, inspection status
- `SymptomReport`: validated reports from WhatsApp, IVR, dashboard, worker, simulation
- `RainfallObservation`: time-series rainfall signal
- `RiskScore`: computed score, factors, confidence, reasoning
- `Alert`: PHC action queue with acknowledge and resolve states
- `AuditLog`: important changes and intake events

## Risk Engine

The risk output is explainable rather than black-box. JalRakshak V2 runs a modular early-warning pipeline rather than a single fixed formula:

```text
symptom reports + rainfall + water quality + water source status
  → anomaly engine      (rolling 14-day z-score baseline → NORMAL/WATCH/EARLY_WARNING/STRONG_ANOMALY)
  → trend               (growth of 24h rate vs prior window)
  → disease engine      (symptom patterns → dominant syndrome + percent)
  → water-risk engine   (turbidity · free chlorine · E. coli · pH · TDS · inspection · rainfall → 0-100)
  → spatial engine      (Haversine clustering on the 72h window → cluster strength in households)
  → early-warning engine (weighted warningIndex → NORMAL/WATCH/EARLY_WARNING/OUTBREAK)
  → risk engine         (weighted 7-factor score 0-100 → LOW/MODERATE/HIGH/CRITICAL)
  → confidence engine   (evidence quality score, decoupled from risk)
  → alert-priority engine (P0/P1/P2/P3 from risk × confidence × exposure × vulnerability × growth)
```

Key principle: **risk ≠ confidence**. A contaminated-source early-water signal can carry HIGH risk with moderate evidence, while a duplicate-report flood produces HIGH risk but LOW confidence and never reaches P0. Every result ships normalized factors, raw metrics, a confidence breakdown, reasons, and a recommended field action — easy to defend in front of judges.

## Verification & Simulation

The eight demo scenarios drive the **real** engine and are validated by `scripts/run-simulation.ts` (`npm run simulate`) and `tests/engines.test.ts` (`npm test`). Inputs use a seeded PRNG (`SIMULATION_SEED`, default 1) so results are reproducible:

| Scenario | Expected |
|----------|----------|
| `TRUE_OUTBREAK` | OUTBREAK / CRITICAL, P0 |
| `HEAVY_RAIN_ONLY` | WATCH / MODERATE (no outbreak from rain alone) |
| `WATER_CONTAMINATION_ONLY` | EARLY_WARNING |
| `SEASONAL_INCREASE` | NORMAL / MODERATE (baseline absorbs seasonality) |
| `DUPLICATE_REPORT_ATTACK` | P1 (confidence drops under duplication) |
| `SENSOR_DATA_FAILURE` | NORMAL, low confidence |
| `HIDDEN_OUTBREAK` | EARLY_WARNING via indirect signals |
| `MULTIPLE_HOTSPOTS` | OUTBREAK / CRITICAL, P0 |

## Local Setup

The local `.env` contains the database connection string and is ignored by git.

```bash
npm install
npm run db:push
npm run db:seed
npm test          # 13 engine + scenario-contract tests
npm run simulate  # 8 scenario contracts, deterministic
npm run dev
```

Open `http://localhost:3000`.

## API

`POST /api/reports`

Accepts JSON:

```json
{
  "locationId": "cuid",
  "source": "WHATSAPP",
  "phone": "+919000000000",
  "symptoms": ["diarrhoea", "vomiting"],
  "severity": 4,
  "onsetAt": "2026-08-13T10:00:00.000Z"
}
```

`POST /api/risk/recalculate`

Requires `x-internal-api-key`. Recalculates one location when `locationId` is supplied, otherwise all locations.

## Security Pass

- Secrets are isolated in `.env`, already covered by `.gitignore`
- Phone numbers are **HMAC-SHA256** hashed (keyed pseudonymisation) before storage — raw numbers never stored
- Zod validates external and dashboard intake
- Report endpoint has an in-memory rate limiter for demo safety
- Twilio signature validation is supported when `TWILIO_AUTH_TOKEN` is configured
- Internal recalculation route requires `x-internal-api-key`
- Production runtime refuses placeholder internal keys
- No raw SQL string interpolation is used
- `npm audit --audit-level=moderate` is part of the verification script set
