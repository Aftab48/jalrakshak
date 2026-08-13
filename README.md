# JalRakshak

JalRakshak is a Next.js public-health command center for predicting waterborne outbreak risk from symptom clusters, rainfall, and water-source status.

## Architecture

Citizen and health-worker reports enter through `/api/reports`, dashboard server actions, or a Twilio WhatsApp/IVR form post. The app validates every payload with Zod, hashes phone numbers before storage, deduplicates repeat reports from the same phone/location window, recalculates the affected location, and opens a PHC alert when the explainable score crosses a threshold.

The stack is intentionally simple for a hackathon build:

- Next.js App Router for UI, backend routes, and server actions
- Prisma with Neon Postgres
- Zod validation on all intake surfaces
- Deterministic risk scoring in `lib/risk-engine.ts`
- Seeded synthetic monsoon and symptom data for a defensible demo

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

The score is explainable rather than black-box:

```text
risk = symptom cluster + growth rate + rainfall + water-source risk + recency + vulnerability - duplicate penalty
```

The output is a 0-100 score, a level, factor breakdown, confidence, plain-English reasoning, and recommended field action. This is easier to defend in front of judges than an overclaimed ML model.

## Local Setup

The local `.env` contains the Neon connection string and is ignored by git.

```bash
npm install
npm run db:push
npm run db:seed
npm run simulate
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
- Phone numbers are SHA-256 hashed before storage
- Zod validates external and dashboard intake
- Report endpoint has an in-memory rate limiter for demo safety
- Twilio signature validation is supported when `TWILIO_AUTH_TOKEN` is configured
- Internal recalculation route requires `x-internal-api-key`
- Production runtime refuses placeholder internal keys
- No raw SQL string interpolation is used
- `npm audit --audit-level=moderate` is part of the verification script set
