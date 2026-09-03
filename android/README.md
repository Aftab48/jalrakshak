# JalRakshak — Android Field Worker App

An offline-first companion Android app for JalRakshak waterborne disease surveillance field workers. It connects to the JalRakshak Next.js backend over REST and follows a **Collect → Verify → Act → Sync** workflow.

## Tech Stack

- **Kotlin 2.1.0**, Jetpack Compose (Material 3), Navigation Compose
- **Room** for offline storage: local health reports, water inspections, alerts, verifications, and a sync-queue
- **Retrofit + OkHttp** with kotlinx-serialization for the backend API
- **WorkManager** for background sync, **DataStore** for settings/session
- CameraX (photo evidence), Google Play Services Location, mock voice intake adapter

## Project Structure

```
android/app/src/main/java/com/jalrakshak/field/
├── JalRakshakApplication.kt        # App container (DB, API, sync, repositories)
├── MainActivity.kt
├── data/
│   ├── local/                       # Room database, entities, DAOs
│   ├── remote/                      # Retrofit API, DTOs, interceptors
│   ├── repository/                  # Implementations + ServiceLocator
│   └── sync/                        # SyncEngine, SyncManager, SyncWorker
├── domain/
│   ├── model/                       # Pure domain models
│   └── repository/                  # Repository interfaces
├── location/ LocationProvider.kt    # GPS capture
├── photo/ PhotoCompressor.kt
├── ui/
│   ├── theme/                       # Material 3 light/dark/system themes
│   ├── navigation/ Screen.kt        # Nav routes
│   ├── components/                  # Badges, EmptyState
│   ├── screens/                     # Login, Home, Alerts, Reports, Water, Profile…
│   └── viewmodel/                   # State holders
└── voice/ MockVoiceRecognitionService.kt  # Demo multilingual symptom parser
```

## Workflow

1. **Collect** — Submit health reports (manual + voice). Stored locally, synced when online.
2. **Verify** — On an alert, complete a field verification questionnaire (cases present, symptoms, water-source condition, notes, GPS).
3. **Act** — Acknowledge / resolve alerts with one tap.
4. **Sync** — WorkManager syncs pending reports, inspections, and verifications; pulls alerts & water sources.

Backend intelligence (risk engine, disease engine, anomaly detection, early warnings, spatial clustering, alert prioritization) intentionally stays on the server — the app only reflects server-derived risk/alert data and submits raw observations.

## Build

```bash
cd android
./gradlew assembleDebug       # Produces app/build/outputs/apk/debug/app-debug.apk
./gradlew testDebugUnitTest   # Unit tests (mappers, vocabulary, voice parser)
```

SDK requirements: compile SDK 35, min SDK 26, AGP 8.7.3, Gradle 8.14.3.

## Configuration

- Debug backend URL defaults to `http://10.0.2.2:4000` (emulator loopback to the dev server).
- Release backend URL is set to `https://jalrakshak.vercel.app` in `build.gradle.kts`.
- API key and base URL are injected via `buildConfigField` in `app/build.gradle.kts`.

## Demo Worker Credentials

| Worker ID | Name           | Role             | PIN  |
|-----------|----------------|------------------|------|
| ASHA-001  | Anjali Devi    | ASHA Worker      | 1234 |
| ASHA-002  | Priya Mondal   | ASHA Worker      | 1234 |
| ANM-001   | Sunita Das     | ANM Worker       | 5678 |
| FW-001    | Rahul Kumar    | Field Supervisor | 9012 |

## Backend API (used by the app)

- `POST /api/android/auth/login` — worker login (token issued)
- `GET /api/android/locations` & `/locations/{id}` — areas & risk data
- `GET /api/android/alerts` & `/alerts/{id}` & `/alerts/{id}/status` — alert list/detail + acknowledge/resolve
- `GET /api/android/water-sources` & `/water-sources/{id}` — water sources & quality history
- `POST /api/android/water-quality` — field water inspection upload
- `POST /api/android/verifications` — field verification upload
- `POST /api/reports` — health report submission

## Design Notes

- The backend `FieldVerification` Prisma model and the `/api/android/*` routes are part of this repo (see `prisma/schema.prisma` and `app/api/android/`).
- The voice adapter is explicitly a **demo**; it does not run real ASR and flags all output as simulated so workers are never misled.
