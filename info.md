# JalRakshak - Complete Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [The Problem](#the-problem)
3. [The Solution](#the-solution)
4. [How It Works - End to End](#how-it-works---end-to-end)
5. [Architecture](#architecture)
6. [Tech Stack](#tech-stack)
7. [Data Model](#data-model)
8. [Risk Engine - Deep Dive](#risk-engine---deep-dive)
9. [API Endpoints](#api-endpoints)
10. [Frontend Dashboard](#frontend-dashboard)
11. [Security](#security)
12. [Simulation System](#simulation-system)
13. [Seeding & Synthetic Data](#seeding--synthetic-data)
14. [Setup & Running](#setup--running)
15. [File-by-File Breakdown](#file-by-file-breakdown)
16. [Data Flow Diagrams](#data-flow-diagrams)

---

## Project Overview

**JalRakshak** (meaning "Water Protector" in Hindi) is a **public-health early-warning command center** built to predict waterborne disease outbreak risk in real-time. It is designed for the **Smart India Hackathon (SIH)** as a prototype for rural and semi-urban India, specifically targeting the **Howrah-Kolkata belt in West Bengal**.

The system monitors symptom reports from citizens and health workers, combines them with rainfall data and water-source contamination status, and produces an **explainable risk score** (0-100) for each monitored location. When the score crosses a threshold, it automatically triggers alerts for Primary Health Centres (PHCs) to take action.

**Key principle**: The risk scoring is fully explainable (not a black-box ML model), making it defensible for judges and actionable for field workers.

---

## The Problem

Waterborne disease outbreaks (cholera, typhoid, diarrheal diseases) are a major public health crisis in India, especially during monsoon season. Current problems:

1. **Delayed detection**: Outbreaks are often detected only after hospitals are overwhelmed
2. **Siloed data**: Symptom reports, rainfall data, and water quality data exist in separate systems
3. **No early warning**: There's no system that combines these signals to predict outbreaks before they peak
4. **Paper-based reporting**: Many areas still rely on manual paper reports that take days to reach decision-makers
5. **Resource waste**: Without risk-based prioritization, PHCs spread resources thin instead of focusing on emerging hotspots

---

## The Solution

JalRakshak creates a unified command center that:

1. **Ingests reports** from multiple channels: WhatsApp, IVR (Interactive Voice Response), dashboard manual entry, and health worker field reports
2. **Validates every report** using Zod schemas to ensure data quality
3. **Deduplicates reports** from the same phone number/location within a 6-hour window
4. **Hashes phone numbers** (HMAC-SHA256 keyed pseudonymisation) before storage for privacy
5. **Computes an explainable early-warning signal** — dynamic anomaly baseline, then a risk score decoupled from evidence confidence, combined into a P0–P3 alert priority
6. **Auto-generates alerts** when scores cross thresholds
7. **Provides a real-time dashboard** with geographic visualization, alert queue, and case feed
8. **Simulates outbreaks** to demonstrate the system works

---

## How It Works - End to End

### Step 1: Report Intake
A citizen or health worker submits a symptom report via:
- **WhatsApp**: Sends a message like "diarrhoea vomiting dehydration" to a Twilio WhatsApp number
- **IVR**: Records symptoms through voice prompts
- **Dashboard**: Health worker fills the manual intake form on the web dashboard
- **API**: External system POSTs JSON to `/api/reports`

### Step 2: Validation & Deduplication
- All input passes through **Zod validation** (required fields, valid enums, severity ranges)
- Phone numbers are **HMAC-SHA256 hashed** (keyed pseudonymisation) for privacy
- The system checks for **duplicates**: same phone hash + same location + same symptoms within 6 hours
- Duplicates are linked via `duplicateOfId` but still counted for awareness

### Step 3: Storage
- Validated report is stored in PostgreSQL via Prisma ORM
- An **audit log** entry is created for every report (with duplicate status noted)
- The report is associated with a location and optionally a water source

### Step 4: Risk Recalculation
Immediately after a new report is stored, the system:
- Fetches all reports from the last 7 days for that location
- Fetches all rainfall observations from the last 7 days
- Fetches all water sources and their current status
- Passes everything to the **risk engine**

### Step 5: Risk Scoring
The risk engine computes a 0-100 score from 6 factors:
- Symptom cluster pressure (0-35)
- Growth rate (0-22)
- Rainfall accumulation (0-18)
- Water source contamination (0-25)
- Report recency (0-10)
- Vulnerability index (0-5.8)
- Minus duplicate penalty (-8)

### Step 6: Alert Generation
If score >= 55 (HIGH or CRITICAL):
- A new alert is created if no existing open alert, or if score jumped 8+ points, or if risk level changed
- Alert contains title, reasoning, and recommended field action
- Alerts appear in the dashboard's PHC action queue

### Step 7: Dashboard Display
The web dashboard shows:
- Geographic map with risk markers (size/color based on score)
- Metric strip (locations monitored, active alerts, critical zones, report count)
- Alert queue with Acknowledge/Resolve actions
- Latest risk scores with factor breakdown bars
- Incoming case signal feed
- Manual report intake form

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        INPUT CHANNELS                           │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│   WhatsApp   │     IVR      │  Dashboard   │  Health Worker    │
│  (Twilio)    │  (Twilio)    │   Form       │  API Call         │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬──────────┘
       │              │              │                │
       └──────────────┴──────┬───────┴────────────────┘
                             │
                    ┌────────▼────────┐
                    │   /api/reports   │  ← Zod validation
                    │   POST endpoint  │  ← Rate limiting
                    └────────┬────────┘  ← Phone hashing
                             │            ← Deduplication
                    ┌────────▼────────┐
                    │   lib/services   │  ← createSymptomReport()
                    │                  │  ← Audit logging
                    └────────┬────────┘
                             │
                    ┌────────▼──────────┐
                    │ lib/risk-engine.ts │  ← computeRisk()
                    │                    │  ← 6-factor scoring
                    └────────┬──────────┘  ← Explainable output
                             │
                    ┌────────▼────────┐
                    │  RiskScore table  │  ← Score + factors stored
                    │  Alert table      │  ← Auto-generated if >= 55
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Dashboard UI    │  ← Real-time visualization
                    │   app/page.tsx    │  ← Alert management
                    └─────────────────┘  ← Report intake form
```

### Technology Choices (Hackathon-Optimized)

| Choice | Reason |
|--------|--------|
| Next.js App Router | Single framework for UI, API routes, and server actions |
| Prisma + Neon Postgres | Serverless-friendly DB with type-safe ORM |
| Zod validation | Runtime type safety on all input surfaces |
| Explainable risk engine | Easier to defend than black-box ML in front of judges |
| Tailwind CSS v4 | Fast styling without custom design system overhead |
| Lucide icons | Lightweight icon set |
| Seeded synthetic data | Defensible demo without real patient data |

---

## Tech Stack

### Frontend
- **Next.js 16.3.0** (App Router) - React framework
- **React 19.2.8** - UI library
- **Tailwind CSS v4** - Utility-first CSS
- **Lucide React** - Icons
- **date-fns** - Date formatting/manipulation
- **Geist + Geist Mono** - Google Fonts

### Backend
- **Next.js API Routes** - REST endpoints
- **Server Actions** (`app/actions.ts`) - Form submissions
- **Zod v4** - Schema validation
- **Prisma 7.9.1** - ORM
- **@prisma/adapter-pg** - PostgreSQL adapter
- **Neon Postgres** - Serverless PostgreSQL database

### Security
- **HMAC-SHA256 hashing** for phone numbers
- **HMAC-SHA1** for Twilio signature validation
- **In-memory rate limiting** (40 req/min per IP)
- **Internal API key** for recalculation endpoint
- **CSP headers** in next.config.ts
- **Environment validation** at startup

### Development
- **TypeScript 5** - Type safety
- **ESLint 9** with next configs
- **tsx** - TypeScript execution for scripts
- **Prisma CLI** - Schema management

---

## Data Model

### Entity Relationship Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│    Location      │────<│   WaterSource     │     │   AuditLog          │
│                  │     │                   │     │                     │
│  id              │     │  id               │     │  id                 │
│  name            │     │  locationId (FK)  │     │  actor              │
│  district        │     │  name             │     │  action             │
│  state           │     │  type             │     │  entity             │
│  type            │     │  status           │     │  entityId           │
│  latitude        │     │  lastInspectedAt  │     │  metadata (JSON)    │
│  longitude       │     │  notes            │     │  createdAt          │
│  population      │     └──────────────────┘     └─────────────────────┘
│  households      │
│  baselineDaily   │     ┌──────────────────┐
│  Cases           │────<│ SymptomReport     │
│  vulnerability   │     │                   │     ┌─────────────────────┐
│  Index           │     │  id               │────>│   RiskScore          │
│                  │     │  locationId (FK)  │     │                     │
└────────┬────────┘     │  waterSourceId(FK)│     │  id                 │
         │              │  source           │     │  locationId (FK)    │
         │              │  phoneHash        │     │  score (0-100)      │
         │              │  reporterName     │     │  level              │
         │              │  ageBand          │     │  windowHours        │
         │              │  symptoms []      │     │  factors (JSON)     │
         │              │  severity         │     │  reasoning          │
         │              │  onsetAt          │     │  computedAt         │
         │              │  reportedAt       │     └────────┬────────────┘
         │              │  latitude         │              │
         │              │  longitude        │     ┌────────▼────────────┐
         │              │  notes            │     │   Alert              │
         │              │  duplicateOfId    │     │                     │
         │              └──────────────────┘     │  id                 │
         │                                       │  locationId (FK)    │
         │              ┌──────────────────┐     │  riskScoreId (FK)   │
         └─────────────>│RainfallObservation│    │  status             │
                        │                   │     │  level              │
                        │  id               │     │  score              │
                        │  locationId (FK)  │     │  title              │
                        │  observedAt       │     │  message            │
                        │  rainfallMm       │     │  recommendedAction  │
                        │  source           │     │  triggeredAt        │
                        └──────────────────┘     │  acknowledgedAt     │
                                                 │  resolvedAt         │
                                                 └─────────────────────┘
```

### Table Details

#### Location
Represents a ward, village, or block being monitored.

| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `name` | String | Location name (e.g., "Baksara Ward 4") |
| `district` | String | District name (e.g., "Howrah") |
| `state` | String | Default: "West Bengal" |
| `type` | Enum | VILLAGE, WARD, BLOCK |
| `latitude` | Decimal(9,6) | GPS coordinate |
| `longitude` | Decimal(9,6) | GPS coordinate |
| `population` | Int | Total population |
| `households` | Int | Number of households |
| `baselineDailyCases` | Decimal(6,2) | Expected daily symptom reports (historical average) |
| `vulnerabilityIndex` | Decimal(4,2) | 0.0-1.0 vulnerability score (infrastructure, demographics) |

#### WaterSource
Tracks drinking water supply points and their contamination status.

| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `locationId` | String (FK) | Parent location |
| `name` | String | Source name |
| `type` | Enum | HAND_PUMP, TUBE_WELL, POND, MUNICIPAL_TAP, TANKER, PRIVATE_WELL |
| `status` | Enum | NORMAL, WATCH, SUSPECTED, CONTAMINATED |
| `lastInspectedAt` | DateTime? | Last field inspection |
| `notes` | String? | Inspector notes |

#### SymptomReport
Individual disease symptom report from any intake channel.

| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `locationId` | String (FK) | Where the case was reported |
| `waterSourceId` | String? (FK) | Associated water source |
| `source` | Enum | WHATSAPP, IVR, DASHBOARD, HEALTH_WORKER, SIMULATION |
| `phoneHash` | String? | HMAC-SHA256 hashed phone number |
| `reporterName` | String? | Name of reporter |
| `ageBand` | String? | Age range: 0-5, 6-14, 15-45, 46-65, 65+ |
| `symptoms` | String[] | Array of symptom codes |
| `severity` | Int | 1-5 scale |
| `onsetAt` | DateTime | When symptoms started |
| `reportedAt` | DateTime | When report was submitted |
| `latitude` | Decimal? | Report location (if available) |
| `longitude` | Decimal? | Report location (if available) |
| `notes` | String? | Additional context |
| `duplicateOfId` | String? | Links to original report if duplicate |

#### RainfallObservation
Time-series rainfall data (synthetic IMD data for demo).

| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `locationId` | String (FK) | Location |
| `observedAt` | DateTime | Observation timestamp |
| `rainfallMm` | Decimal(7,2) | Rainfall in millimeters |
| `source` | String | Default: "synthetic-imd" |

Unique constraint: `(locationId, observedAt)`

#### RiskScore
Computed risk assessment for a location.

| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `locationId` | String (FK) | Assessed location |
| `score` | Int | 0-100 risk score |
| `level` | Enum | LOW, MODERATE, HIGH, CRITICAL |
| `windowHours` | Int | Default: 72 (assessment window) |
| `factors` | JSON | Factor breakdown with numeric values |
| `reasoning` | String | Plain-English explanation |
| `computedAt` | DateTime | When score was calculated |

#### Alert
Actionable alert for Primary Health Centres.

| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `locationId` | String (FK) | Affected location |
| `riskScoreId` | String? (FK) | Triggering risk score |
| `status` | Enum | OPEN, ACKNOWLEDGED, RESOLVED, DISMISSED |
| `level` | Enum | Risk level |
| `score` | Int | Score at time of alert |
| `title` | String | Alert headline |
| `message` | String | Detailed reasoning |
| `recommendedAction` | String | What field workers should do |
| `triggeredAt` | DateTime | When alert was created |
| `acknowledgedAt` | DateTime? | When someone acknowledged it |
| `resolvedAt` | DateTime? | When issue was resolved |

#### AuditLog
Immutable audit trail for all system events.

| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `actor` | String | Who performed the action |
| `action` | String | Action type (e.g., "report.created") |
| `entity` | String | Entity type (e.g., "SymptomReport") |
| `entityId` | String? | Entity ID |
| `metadata` | JSON? | Additional context |
| `createdAt` | DateTime | When the event occurred |

---

## Risk Engine - Deep Dive

The risk engine is the core intelligence of JalRakshak. It is located in `lib/risk-engine.ts` and produces a **fully explainable** risk assessment.

### Input Parameters

```typescript
type RiskInput = {
  locationName: string;
  population: number;
  baselineDailyCases: number;  // Historical average daily reports
  vulnerabilityIndex: number;  // 0.0-1.0
  reports: SymptomReport[];    // Last 7 days
  rainfall: RainfallObservation[];  // Last 7 days
  waterSources: WaterSource[];      // Current status
  now?: Date;                       // For testing
};
```

### Six Risk Factors

#### 1. Symptom Cluster (0-35 points)
Measures how many reports exceed the baseline for a 3-day window.

```
expectedCases = max(1, baselineDailyCases * 3)
clusterPressure = min(28, (reportsIn72h / expectedCases) * 12)
symptomSeverity = average(severity of reports) * 2.2
symptomCluster = min(35, clusterPressure + symptomSeverity)
```

**Example**: If baseline is 1.4/day and 13 reports come in 72h:
- expectedCases = 4.2
- clusterPressure = min(28, (13/4.2) * 12) = min(28, 37.1) = 28
- If average severity = 3: symptomSeverity = 6.6
- symptomCluster = min(35, 28 + 6.6) = 34.6

#### 2. Growth Rate (0-22 points)
Compares the last 24h against the previous 48h to detect accelerating outbreaks.

```
previousDailyRate = reportsInPrevious48h / 2
if previousDailyRate == 0:
    if reportsIn24h >= 4: growthRate = 18
    else: growthRate = reportsIn24h * 2
else:
    growthRate = min(22, max(0, ((reportsIn24h - previousDailyRate) / previousDailyRate) * 12))
```

**Example**: If 8 reports in last 24h and 4 reports in the 48h before that:
- previousDailyRate = 2
- growthRate = min(22, ((8-2)/2) * 12) = min(22, 36) = 22

#### 3. Rainfall (0-18 points)
Measures accumulated rainfall over 72 hours. Heavy rainfall is correlated with water contamination.

```
rainfall72h = sum of all rainfall in last 72h
rainfallScore = min(18, rainfall72h / 5)
```

**Example**: If 60mm of rain in 72h:
- rainfallScore = min(18, 60/5) = 12

#### 4. Water Source Contamination (0-25 points)
Based on the worst water source status and reports linked to flagged sources.

```
statusWeight = {
  NORMAL: 0,
  WATCH: 8,
  SUSPECTED: 17,
  CONTAMINATED: 25
}
worstWaterSource = max weight of any water source
suspectSourceReports = count of reports linked to non-NORMAL sources
waterSource = min(25, worstWaterSource + suspectSourceReports * 2)
```

#### 5. Recency (0-10 points)
How recently the newest report was submitted. More recent = higher urgency.

```
hoursSinceNewest = hours since most recent report in last 72h
recency = max(0, 10 - hoursSinceNewest * 1.4)
```

**Example**: If newest report was 3 hours ago:
- recency = max(0, 10 - 4.2) = 5.8

#### 6. Vulnerability Index (0-5.8 points)
Location-specific vulnerability based on infrastructure quality, demographics, etc.

```
vulnerability = vulnerabilityIndex * 10
```

#### Duplicate Penalty (-8 points)
If there are reports in 72h but only 1-2 unique phone numbers, the system reduces the score to account for potential duplicate reporting.

```
duplicatePenalty = (reportsIn72h > 0 && uniqueReporters <= 2) ? 8 : 0
```

### Final Score Calculation

```
rawScore = symptomCluster + growthRate + rainfall + waterSource + recency + vulnerability - duplicatePenalty
score = clamp(round(rawScore), 0, 100)
```

### Risk Levels

| Score Range | Level | Color | Recommended Action |
|-------------|-------|-------|-------------------|
| 0-31 | LOW | Green | Continue passive surveillance and routine water-source checks |
| 32-54 | MODERATE | Yellow | Increase monitoring for 24 hours and confirm whether cases share a water source |
| 55-74 | HIGH | Orange | Ask ASHA workers to verify clusters, inspect flagged water sources, and prepare ORS distribution |
| 75-100 | CRITICAL | Red | Dispatch PHC verification, test shared water points, send ORS and boil-water advisory immediately |

### Confidence Score

The engine also computes a confidence score (15-100) based on:
- Number of reports (0-55 points, 5 points per report)
- Number of unique reporters (0-25 points, 4 points per reporter)
- Whether rainfall data is available (8 or 20 points)

### Output

```typescript
type RiskOutput = {
  score: number;          // 0-100
  level: string;          // LOW/MODERATE/HIGH/CRITICAL
  factors: {
    symptomCluster: number;
    growthRate: number;
    rainfall: number;
    waterSource: number;
    recency: number;
    confidence: number;
    reportCount72h: number;
    uniqueReporterCount72h: number;
  };
  reasoning: string;      // Plain-English explanation
  recommendedAction: string;  // What to do
};
```

---

## API Endpoints

### 1. `POST /api/reports` - Submit Symptom Report

**Purpose**: Ingest new symptom reports from any channel.

**Input (JSON)**:
```json
{
  "locationId": "cuid",
  "waterSourceId": "cuid (optional)",
  "source": "WHATSAPP | IVR | DASHBOARD | HEALTH_WORKER | SIMULATION",
  "phone": "+919000000000 (optional)",
  "reporterName": "string (optional)",
  "ageBand": "0-5 | 6-14 | 15-45 | 46-65 | 65+ (optional)",
  "symptoms": ["diarrhoea", "vomiting", "fever", "stomach_pain", "dehydration", "jaundice", "rash", "headache"],
  "severity": 1-5,
  "onsetAt": "ISO datetime",
  "latitude": -90 to 90 (optional),
  "longitude": -180 to 180 (optional),
  "notes": "string up to 500 chars (optional)"
}
```

**Processing**:
1. Rate limit check (30 requests per IP per minute)
2. If content-type is form data, parses as Twilio format with signature validation
3. Zod validation of all fields
4. Phone number hashing
5. Water source / location validation
6. Duplicate detection (same phone + location + symptoms within 6h)
7. Report creation in database
8. Audit log entry
9. Automatic risk recalculation for the location

**Response**:
```json
{
  "ok": true,
  "reportId": "cuid",
  "duplicateOfId": "cuid or null"
}
```

**Error Responses**:
- 400: Invalid payload or water source mismatch
- 429: Rate limited
- 500: Server error

### 2. `POST /api/risk/recalculate` - Recalculate Risk Scores

**Purpose**: Trigger risk score recalculation for one or all locations.

**Headers**: `x-internal-api-key: <secret>`

**Input (JSON, optional)**:
```json
{
  "locationId": "cuid (optional, omit for all locations)"
}
```

**Response**:
```json
{
  "ok": true,
  "recalculated": 8,
  "scores": [
    {
      "locationId": "cuid",
      "location": "Baksara Ward 4",
      "score": 72,
      "level": "HIGH",
      "reasoning": "Baksara Ward 4: high risk because..."
    }
  ]
}
```

### 3. `GET /api/health` - Health Check

**Purpose**: Verify the service and database are operational.

**Response (200)**:
```json
{
  "ok": true,
  "service": "jalrakshak",
  "database": "reachable"
}
```

**Response (503)**:
```json
{
  "ok": false,
  "service": "jalrakshak",
  "database": "unreachable"
}
```

---

## Frontend Dashboard

The dashboard is a server-rendered Next.js page (`app/page.tsx`) with the following sections:

### Layout
- **Rail (sidebar)**: Brand mark "JR" + navigation icons (Map, Alerts, Intake)
- **Workspace**: Main content area

### Metric Strip
Four key metrics at the top:
1. **Locations monitored**: Total count of tracked locations
2. **Active alerts**: Count of OPEN/ACKNOWLEDGED alerts
3. **Critical zones**: Count of locations at CRITICAL risk level
4. **Reports in feed**: Total reports in the recent feed

### Geographic Risk Map
- SVG-based map of the Howrah-Kolkata pilot belt
- Plotting uses real GPS coordinates mapped to SVG viewport
- Each location is a marker with:
  - Size proportional to risk score (18-38px diameter)
  - Color indicating risk level (green/yellow/orange/red)
  - Score number displayed inside
  - Location name, district, and type below

### Alert Queue
- Lists all OPEN and ACKNOWLEDGED alerts
- Each alert shows:
  - Risk level badge
  - Title and message
  - Recommended field action
  - Acknowledge/Resolve button
- Server actions handle state transitions

### Risk Score Panel
- Shows latest risk scores for all locations
- For each location:
  - Name and score with level badge
  - Plain-English reasoning
  - Factor breakdown as horizontal bars (symptomCluster, growthRate, rainfall, waterSource, recency)

### Case Signal Feed
- Shows the 18 most recent symptom reports
- Each entry shows:
  - Location name
  - Symptoms list
  - Severity
  - Time since report (relative)

### Manual Report Intake Form
A client-side form component (`ReportForm`) that:
- Uses React's `useActionState` for progressive enhancement
- Fields:
  - Location selector (dropdown)
  - Water source selector (optional, filtered by location)
  - Reporter name
  - Age band (5 ranges)
  - Onset datetime
  - Severity slider (1-5)
  - Symptom checkboxes (6 options)
  - Notes textarea
- Submits via server action to `submitManualReport`
- Shows success/error feedback
- Disables button while submitting

### Responsive Design
- Desktop: Two-column grid (map + sidebar panels)
- Tablet (<1100px): Single column
- Mobile (<760px): Rail becomes top navigation bar, all sections stack

---

## Security

### Phone Number Privacy
- All phone numbers are HMAC-SHA256 hashed (keyed pseudonymisation) before storage using `lib/security.ts:hashPhone()`; the raw number is never stored
- Normalization strips non-digit characters before hashing

### Input Validation
- All external inputs validated with Zod schemas (`lib/contracts.ts`)
- Custom `safeString` sanitizer strips control characters
- Symptom lists constrained to predefined values
- Severity constrained to 1-5 integer
- Location IDs validated as CUIDs

### Rate Limiting
- In-memory rate limiter in `lib/security.ts`
- 30 requests per minute per client IP for `/api/reports`
- Client IP extracted from `x-forwarded-for` or `x-real-ip` headers

### Authentication
- `/api/risk/recalculate` requires `x-internal-api-key` header
- Production environment refuses to start with placeholder dev keys
- Twilio webhook validation with HMAC-SHA1 signature checking

### HTTP Security Headers
Configured in `next.config.ts`:
- Content-Security-Policy (restrictive, self-only)
- Referrer-Policy: strict-origin-when-cross-origin
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Permissions-Policy: camera/microphone/geolocation disabled

### Database Security
- No raw SQL string interpolation
- Prisma parameterized queries throughout
- Environment variables validated at startup with Zod
- `.env` files excluded from git

### Audit Trail
- Every report creation logged with actor, action, entity, and metadata
- Alert state transitions (acknowledge, resolve) logged
- Duplicate detection flagged in audit

---

## Simulation System

The simulation layer runs the **real intelligence pipeline** on synthetic inputs to prove outbreak detection works — nothing about the numbers is animated or faked.

### Scenario Contracts

`lib/simulation-presets.ts` + `lib/simulation-engine.ts` define **8 demo scenarios**, each a self-contained what-if that the engine must classify correctly. `scripts/run-simulation.ts` (`npm run simulate`) and `tests/engines.test.ts` both verify them:

| Scenario | Why it matters | Expected |
|----------|----------------|----------|
| `TRUE_OUTBREAK` | severe spike + cluster + contaminated water | OUTBREAK / CRITICAL, P0 |
| `HEAVY_RAIN_ONLY` | must NOT flag an outbreak from rain alone | WATCH / MODERATE |
| `WATER_CONTAMINATION_ONLY` | early warning driven by water risk | EARLY_WARNING |
| `SEASONAL_INCREASE` | rolling baseline absorbs a smooth doubling | NORMAL/MODERATE, not outbreak |
| `DUPLICATE_REPORT_ATTACK` | duplicate flood keeps HIGH risk but low confidence → not P0 | P1 |
| `SENSOR_DATA_FAILURE` | missing rainfall/water evidence → low confidence | NORMAL, low confidence |
| `HIDDEN_OUTBREAK` | mild symptoms, no lab, no rainfall signal | EARLY_WARNING via indirect signals |
| `MULTIPLE_HOTSPOTS` | several spatial clusters simultaneously | OUTBREAK / CRITICAL, P0 |

### Determinism

Inputs are generated with a seeded PRNG (`mulberry32`) driven by `SIMULATION_SEED` (default 1) folded with the day-of-year, so results are stable across repeated runs. Current verified output:

```
TRUE_OUTBREAK            OUTBREAK / CRITICAL / 93  conf 82 P0
HEAVY_RAIN_ONLY          WATCH     / MODERATE  / 46  conf 55 P2
WATER_CONTAMINATION_ONLY EARLY_WARNING / MODERATE / 52 conf 55 P2
SEASONAL_INCREASE        NORMAL    / MODERATE  / 40  conf 67 P3
DUPLICATE_REPORT_ATTACK  OUTBREAK  / HIGH      / 73  conf 47 P1
SENSOR_DATA_FAILURE      NORMAL    / MODERATE  / 35  conf 35 P3
HIDDEN_OUTBREAK          EARLY_WARNING / HIGH  / 58  conf 65 P2
MULTIPLE_HOTSPOTS        OUTBREAK  / CRITICAL  / 76  conf 84 P0
```

### What-if Simulator (dashboard)

The sidebar `what-if-simulator.tsx` exposes sliders (rainfall, symptom increase, growth, water contamination, vulnerability, spatial strength, E. coli toggle, unique phones, history scale) plus the eight scenario chips as one-click presets. Each run calls `simulateWhatIfAction` → builds a synthetic location → runs the real engine → shows the resulting warning/score/confidence/priority and factor bars.

---

## Seeding & Synthetic Data

The seed script (`prisma/seed.ts`) creates a realistic demo dataset for the Howrah-Kolkata belt.

### 8 Seeded Locations

| Location | District | Type | Population | Baseline Cases | Vulnerability |
|----------|----------|------|------------|----------------|---------------|
| Baksara Ward 4 | Howrah | WARD | 18,420 | 2.1/day | 0.46 |
| Santragachi Cluster | Howrah | WARD | 22,680 | 1.8/day | 0.39 |
| Kadamtala Ward 9 | Howrah | WARD | 31,200 | 2.4/day | 0.52 |
| Bijoygarh Block | Kolkata | WARD | 27,400 | 1.6/day | 0.31 |
| Jadavpur East | Kolkata | WARD | 33,480 | 1.7/day | 0.28 |
| Salt Lake Sector 3 | Kolkata | WARD | 18,900 | 1.1/day | 0.18 |
| Maheshtala River Belt | South 24 Parganas | BLOCK | 42,100 | 2.8/day | 0.64 |
| Uluberia Rural Pocket | Howrah | VILLAGE | 12,860 | 1.9/day | 0.58 |

### Water Sources
Each location gets 2 water sources:
- 1 Municipal Tap
- 1 Hand Pump

Pre-flagged statuses:
- Maheshtala: Hand pump is CONTAMINATED
- Kadamtala: Municipal tap is SUSPECTED
- Baksara: Hand pump is WATCH

### Rainfall Data
- 13 observations per location (every 12 hours over 7 days)
- Monsoon pulse pattern: higher intensity in last 72 hours
- Location-specific intensities:
  - Maheshtala: 19mm base (heaviest rain)
  - Kadamtala: 13mm base
  - Baksara: 9mm base
  - Others: 3mm base

### Symptom Reports
Report count varies by location:
- Maheshtala: 32 reports (outbreak scenario)
- Kadamtala: 21 reports (elevated)
- Baksara: 13 reports (moderate)
- Others: 2-8 reports (baseline)

Report characteristics:
- Sources: 20% WhatsApp, 14% IVR, 66% Health Worker
- Symptoms: 25% have severe trio (diarrhoea+vomiting+dehydration), 75% have diarrhoea+fever
- Severity: Higher in flagged locations
- Reports span 1-94 hours ago
- 50% of reports linked to water sources

### Post-Seeding
After all data is created, `recalculateAllRisk()` is called to generate initial risk scores and alerts for all locations.

---

## Setup & Running

### Prerequisites
- Node.js 18+
- A Neon PostgreSQL database (or any PostgreSQL)
- `.env` file with credentials

### Environment Variables

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=verify-full&channel_binding=require"
APP_ENV="development"
INTERNAL_API_KEY="replace-with-a-long-random-secret"
TWILIO_AUTH_TOKEN=""  # Optional, for WhatsApp/IVR integration
```

### Step-by-Step Setup

```bash
# 1. Install dependencies
npm install

# 2. Push Prisma schema to database
npm run db:push

# 3. Seed synthetic data (creates 8 locations, ~110 reports, rainfall, water sources)
npm run db:seed

# 4. Run simulation to verify outbreak detection works
npm run simulate

# 5. Start development server
npm run dev

# 6. Open http://localhost:3000
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Generate Prisma client and build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Seed database with synthetic data |
| `npm run simulate` | Run outbreak simulation test |
| `npm run security:audit` | Run npm security audit |

---

## File-by-File Breakdown

### Root Configuration Files

#### `package.json`
- Project name: "jalrakshak"
- Scripts for dev, build, seed, simulate, audit
- Dependencies: Next.js 16, React 19, Prisma 7, Zod 4, Tailwind 4, date-fns, lucide-react

#### `next.config.ts`
- Turbopack configuration
- Security headers: CSP, Referrer-Policy, X-Frame-Options, Permissions-Policy

#### `tsconfig.json`
- Target: ES2017
- Strict mode enabled
- Path alias: `@/*` maps to root

#### `prisma.config.ts`
- Points to `prisma/schema.prisma`
- Uses `DATABASE_URL` from environment

#### `eslint.config.mjs`
- Uses ESLint 9 flat config
- Extends next core-web-vitals and typescript configs

#### `postcss.config.mjs`
- Single plugin: `@tailwindcss/postcss`

#### `.env.example`
- 4 required variables: DATABASE_URL, APP_ENV, INTERNAL_API_KEY, TWILIO_AUTH_TOKEN

#### `.gitignore`
- Standard Next.js ignores + `.env*` files

---

### `lib/` - Core Business Logic

#### `lib/env.ts`
- Validates all environment variables at startup using Zod
- `assertSafeRuntime()` prevents running production with dev keys
- Exports validated `env` object

#### `lib/prisma.ts`
- Singleton Prisma client using Neon's `PrismaPg` adapter
- Global cache prevents multiple instances in development
- Logging: warn+error in dev, error only in production

#### `lib/contracts.ts`
- `reportSchema`: Zod schema for all report intake fields
- `manualReportSchema`: Extended schema for dashboard form (onsetAt as string)
- `symptomOptions`: Valid symptom codes array

#### `lib/security.ts`
- `hashPhone()`: HMAC-SHA256 keyed hash of normalized phone number (raw number never stored)
- `clientIp()`: Extract client IP from request headers
- `assertRateLimit()`: In-memory rate limiter with sliding window
- `assertInternalRequest()`: Validate internal API key
- `validateTwilioSignature()`: HMAC-SHA1 Twilio webhook validation
- `safeString()`: Zod transformer that strips control characters

#### `lib/risk-engine.ts`
- `computeRisk()`: Pure function that takes risk input and produces score + factors + reasoning
- 6-factor scoring system (detailed in Risk Engine section above)
- `actionFor()`: Maps risk level to recommended field action
- Helper functions: average, round1, clamp, confidenceScore

#### `lib/services.ts`
- `createSymptomReport()`: Full report creation pipeline (validate, hash, deduplicate, store, audit, recalculate)
- `recalculateLocationRisk()`: Fetch location data, compute risk, store score, generate alerts
- `recalculateAllRisk()`: Batch recalculate all locations
- `getDashboardData()`: Fetch all dashboard data in parallel (locations, scores, alerts, reports, metrics)

---

### `app/` - Frontend & Server

#### `app/layout.tsx`
- Root layout with Geist fonts
- Metadata: title "JalRakshak", description about waterborne outbreak warning

#### `app/page.tsx`
- Server component (force-dynamic rendering)
- Fetches all dashboard data via `getDashboardData()`
- Renders: rail nav, topbar, metric strip, geographic map, alert queue, risk scores, case feed, report form
- `getMapPosition()`: Maps GPS coordinates to SVG percentages
- `Metric` component: Reusable metric display

#### `app/actions.ts`
- `"use server"` directives for server actions
- `submitManualReport()`: Parses form data, validates, creates report, revalidates page
- `acknowledgeAlert()`: Updates alert status to ACKNOWLEDGED
- `resolveAlert()`: Updates alert status to RESOLVED
- `recalculateRiskAction()`: Triggers full risk recalculation

#### `app/components/report-form.tsx`
- Client component using `useActionState`
- Location and water source selectors
- Symptom checkboxes, severity slider, onset datetime
- Success/error feedback messages
- Disabled state during submission

#### `app/globals.css`
- Tailwind CSS v4 import
- Custom CSS variables for theming
- Grid-based layout system
- Map marker styling with risk-level colors
- Alert, score, and feed list styling
- Form styling
- Responsive breakpoints

---

### `app/api/` - REST Endpoints

#### `app/api/health/route.ts`
- Simple GET endpoint
- Tests database connectivity with `SELECT 1`
- Returns 200 if OK, 503 if unreachable

#### `app/api/reports/route.ts`
- POST endpoint for report intake
- Dual-format: handles JSON and Twilio form data
- Rate limiting, Zod validation, error handling
- `parseTwilioForm()`: Extracts symptoms from WhatsApp message body

#### `app/api/risk/recalculate/route.ts`
- POST endpoint requiring internal API key
- Accepts optional `locationId` for single location or empty for all
- Returns recalculated scores with reasoning

---

### `prisma/` - Database

#### `prisma/schema.prisma`
- 7 models: Location, WaterSource, SymptomReport, RainfallObservation, RiskScore, Alert, AuditLog
- 6 enums: LocationType, ReportSource, RiskLevel, AlertStatus, WaterSourceType, WaterSourceStatus
- Indexes on frequently queried columns
- Cascade deletes from Location to child tables

#### `prisma/seed.ts`
- Creates 8 locations with realistic GPS coordinates in Howrah/Kolkata
- Generates water sources with pre-set contamination statuses
- Creates rainfall observations with monsoon patterns
- Generates symptom reports with varying severity and sources
- Calls `recalculateAllRisk()` to initialize scores

---

### `scripts/` - Automation

#### `scripts/run-simulation.ts`
- Injects 9 severe symptom reports into a target location
- Tests against a safe control location
- Verifies: spike sensitivity, control stability, explainability
- Exits with code 1 if any check fails

---

## Data Flow Diagrams

### Report Submission Flow

```
User submits form/API call
        │
        ▼
┌─────────────────┐
│  Rate Limiter   │── rejected? → 429 Too Many Requests
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Zod Validation │── invalid? → 400 Bad Request
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Phone Hashing  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Duplicate Check│
│  (6h window)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DB Insert      │
│  (SymptomReport)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Audit Log      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Risk Recalc    │
│  (this location)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Store Score    │
│  Check Threshold│
└────────┬────────┘
         │
    ┌────┴────┐
    │ Score   │
    │ >= 55?  │
    └────┬────┘
    Yes  │  No
    │    └──→ Done
    ▼
┌─────────────────┐
│  Create Alert   │
│  (if needed)    │
└─────────────────┘
```

### Risk Calculation Flow

```
┌──────────────────────────────────────────┐
│           Fetch Location Data             │
│  - Location metadata                     │
│  - Reports (last 7 days)                 │
│  - Rainfall (last 7 days)                │
│  - Water sources (current status)        │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│           Compute Risk Factors            │
│                                          │
│  ┌─────────────┐  ┌──────────────┐      │
│  │  Symptom     │  │ Growth Rate  │      │
│  │  Cluster     │  │              │      │
│  │  (0-35)     │  │  (0-22)      │      │
│  └──────┬──────┘  └──────┬───────┘      │
│         │                │               │
│  ┌──────┴──────┐  ┌─────┴────────┐      │
│  │  Rainfall   │  │ Water Source  │      │
│  │  (0-18)    │  │  (0-25)       │      │
│  └──────┬─────┘  └──────┬───────┘      │
│         │                │               │
│  ┌──────┴──────┐  ┌─────┴────────┐      │
│  │  Recency   │  │ Vulnerability │      │
│  │  (0-10)    │  │  (0-5.8)      │      │
│  └──────┬─────┘  └──────┬───────┘      │
│         │                │               │
│         └───────┬────────┘               │
│                 │                        │
│         ┌───────┴───────┐               │
│         │ Sum + Clamp   │               │
│         │ - Duplicate   │               │
│         │   Penalty     │               │
│         └───────┬───────┘               │
│                 │                        │
│         ┌───────▼───────┐               │
│         │  Score 0-100  │               │
│         │  + Level      │               │
│         │  + Factors    │               │
│         │  + Reasoning  │               │
│         │  + Action     │               │
│         └───────────────┘               │
└──────────────────────────────────────────┘
```

### Dashboard Data Loading

```
┌────────────────────────────────────────┐
│        getDashboardData()               │
│                                        │
│  ┌──────────────┐                      │
│  │ findMany()   │ → All locations      │
│  │ locations    │   with waterSources  │
│  └──────────────┘                      │
│                                        │
│  ┌──────────────┐                      │
│  │ findMany()   │ → Latest 100 risk   │
│  │ riskScores   │   scores with        │
│  │              │   location data      │
│  └──────────────┘                      │
│                                        │
│  ┌──────────────┐                      │
│  │ findMany()   │ → OPEN/ACKNOWLEDGED │
│  │ alerts       │   alerts with        │
│  │              │   location data      │
│  └──────────────┘                      │
│                                        │
│  ┌──────────────┐                      │
│  │ findMany()   │ → Latest 18 reports │
│  │ reports      │   with location and  │
│  │              │   water source data  │
│  └──────────────┘                      │
│                                        │
│  All 4 queries run in parallel         │
│  via Promise.all()                     │
│                                        │
│  Post-processing:                      │
│  - Deduplicate scores by location      │
│  - Compute metrics (counts, 24h)       │
└────────────────────────────────────────┘
```

---

## Summary

JalRakshak is a complete, functional prototype of a waterborne disease early-warning system. It demonstrates:

1. **Multi-channel data ingestion** (WhatsApp, IVR, dashboard, API)
2. **Privacy-preserving design** (hashed phone numbers)
3. **Deduplication intelligence** (prevents inflated counts)
4. **Explainable AI** (6-factor risk scoring with plain-English reasoning)
5. **Automated alerting** (threshold-based PHC alerts with actions)
6. **Real-time dashboard** (geographic visualization, alerts, metrics)
7. **Simulation capability** (proves the system detects outbreaks)
8. **Production-grade security** (rate limiting, auth, CSP headers, audit logs)
9. **Hackathon-ready architecture** (simple stack, seeded demo data, zero-config setup)

The system is designed to be **defensible in front of judges** because every risk score comes with a human-readable explanation of which factors contributed to the risk level, making it transparent and trustworthy compared to black-box ML alternatives.

---

## V2: Explainable Early-Warning Engine

JalRakshak V2 moves from a static six-factor score to a modular early-warning pipeline. The risk number on the dashboard is now one part of a wider decision output:

```
symptom reports + rainfall + water quality + water source status
        │
        ├── anomaly-engine      rolling 14-day baseline → NORMAL/WATCH/EARLY_WARNING/STRONG_ANOMALY
        ├── trend               growth of 24h rate vs previous 24–72h window
        ├── disease-engine      symptom-set pattern match → dominant syndrome (acute diarrheal /
        │                       typhoid-like / hepatitis-like) with percent
        ├── water-risk-engine   turbidity · free chlorine · e-coli · pH · TDS · inspection score ·
        │                       rainfall interaction → waterRisk 0–100
        └── spatial-engine      Haversine clustering (~900 m) → cluster strength in households
        │
        └── early-warning-engine  weighted warningIndex (0–1) → warningLevel
                                  NORMAL/WATCH/EARLY_WARNING/OUTBREAK
        │
        ├── risk-engine         weighted 7-factor score 0–100 (LOW/MODERATE/HIGH/CRITICAL)
        ├── confidence-engine   evidence quality score (count · uniqueness · sources ·
        │                       rainfall/water/spatial data present · duplicate penalty)
        └── alert-priority-engine  P0/P1/P2/P3 from risk × confidence × exposure × vulnerability × growth
```

### Key design decisions

- **Risk ≠ confidence.** A contaminated-source early-water signal can carry HIGH risk with moderate evidence; a duplicate-report flood produces HIGH risk but LOW confidence, so it never reaches P0.
- **Rolling baseline absorbs seasonality.** Each location keeps its own 14-day report-rate baseline (from 30 days of data), so a smooth seasonal doubling reads as `WATCH`, not `OUTBREAK`.
- **Weights are configurable** via `RISK_PROFILES` in `lib/risk-engine.ts` and are per-dominant-syndrome (prototype starting values — not clinically validated coefficients).
- **Everything is explainable.** Normalized factors, raw metrics, confidence breakdown, and reasons are returned with every result and rendered on the dashboard.

### New V2 movements

- `lib/anomaly-engine.ts` — z-score vs rolling mean with a floor to avoid exploding on tiny counts.
- `lib/disease-engine.ts` — 3 syndrome profiles over 13 canonical symptoms.
- `lib/water-risk-engine.ts` — WHO-inspired thresholds (`WATER_THRESHOLDS`).
- `lib/spatial-engine.ts` — greedy distance clustering.
- `lib/confidence-engine.ts` — evidence-quality score separate from risk.
- `lib/alert-priority-engine.ts` — P0–P3 with product-of-factors model.
- `lib/early-warning-engine.ts` — aggregation and warning level (with a low-confidence cap).
- `lib/simulation-engine.ts` + `lib/simulation-presets.ts` — 8 scenario contracts run against the *real* engine (`scripts/run-simulation.ts`, also covered by `npm test`).
- `lib/voice-intake.ts` — language-aware mock voice adapter (8 Indian languages) with a `parseVoiceReport` contract ready to swap in a real ASR + NLU service.

### New V2 database fields

`WaterSource.lastInspectedAt`/`notes` · `WaterQualityObservation` model (`sampleMethod`, `confidence`) · `SymptomReport.syndromeSignal` · `RiskScore.confidence/warningLevel/priority/dominantSyndrome/rawMetrics` · `Alert.priority/confidence/warningLevel`.

### V2 dashboard

Risk map markers are ringed by warning level; the alert queue shows P0–P3 priority, warning level, score, confidence and recommended action; the risk panel renders the 7-factor breakdown plus confidence, warning and priority; a water-intelligence panel shows source-level turbidity/chlorine/E. coli/inspection; a **what-if simulator** drives the real engine from sliders + eight scenario presets; a **scenario runner** injects synthetic records into the live system for demo.

### Verification

- `npx tsc --noEmit` ✓
- `npm run lint` ✓ (zero warnings)
- `npm test` — engine + 8 scenario-contract tests (`tests/engines.test.ts`) ✓ (13/13)
- `npx tsx scripts/run-simulation.ts` — all 8 scenario contracts pass, deterministically ✓
- `next build` ✓ (page stays server-rendered / dynamic)
- `npm run db:push` / `npm run db:seed` — verified end-to-end against a local PostgreSQL. The seed now writes:
  - 60 days of rainfall per location (monsoon ramp pattern),
  - 45–90 days of case logs with **true per-day timestamps** (`reportedAt` is explicitly set — not left to the column default) and tight coordinate clustering on recent days,
  - typed water sources (primary municipal tap + tube well + pond) with weekly lab + recent field-test water-quality panels,
  - per-location `syndromeSignal` and phone-hash pools,
  then recomputes all risk and prints a per-location model-output summary.

  Because timestamps are now correctly distributed, the seeded demo yields a meaningful **spread** of risk across patterns (e.g. `normal` locations read WATCH/MODERATE ~38, `outbreak`/`hidden` locations read OUTBREAK/CRITICAL ~78–83), instead of every location collapsing into a single simultaneous 24h "outbreak".

- **Deterministic simulation**: `lib/simulation-engine.ts` uses a seeded PRNG (`mulberry32`, seed from `SIMULATION_SEED`, default 1, folded with the day-of-year) so what-if projections and the 8 scenario checks are reproducible across runs rather than jitter-dependent.
