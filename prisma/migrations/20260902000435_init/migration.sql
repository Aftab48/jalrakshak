-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('VILLAGE', 'WARD', 'BLOCK');

-- CreateEnum
CREATE TYPE "ReportSource" AS ENUM ('WHATSAPP', 'IVR', 'DASHBOARD', 'HEALTH_WORKER', 'SIMULATION');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "WaterSourceType" AS ENUM ('HAND_PUMP', 'TUBE_WELL', 'POND', 'MUNICIPAL_TAP', 'TANKER', 'PRIVATE_WELL');

-- CreateEnum
CREATE TYPE "WaterSourceStatus" AS ENUM ('NORMAL', 'WATCH', 'SUSPECTED', 'CONTAMINATED');

-- CreateEnum
CREATE TYPE "WarningLevel" AS ENUM ('NORMAL', 'WATCH', 'EARLY_WARNING', 'OUTBREAK');

-- CreateEnum
CREATE TYPE "AlertPriority" AS ENUM ('P0', 'P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "SampleMethod" AS ENUM ('FIELD_TEST', 'LAB', 'SENSOR', 'DEMO', 'SIMULATION');

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'West Bengal',
    "type" "LocationType" NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "population" INTEGER NOT NULL,
    "households" INTEGER NOT NULL,
    "baselineDailyCases" DECIMAL(6,2) NOT NULL DEFAULT 1.4,
    "vulnerabilityIndex" DECIMAL(4,2) NOT NULL DEFAULT 0.35,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterSource" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WaterSourceType" NOT NULL,
    "status" "WaterSourceStatus" NOT NULL DEFAULT 'NORMAL',
    "lastInspectedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "WaterSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomReport" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "waterSourceId" TEXT,
    "source" "ReportSource" NOT NULL,
    "phoneHash" TEXT,
    "reporterName" TEXT,
    "ageBand" TEXT,
    "symptoms" TEXT[],
    "severity" INTEGER NOT NULL DEFAULT 2,
    "onsetAt" TIMESTAMP(3) NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "notes" TEXT,
    "duplicateOfId" TEXT,
    "syndromeSignal" JSONB,

    CONSTRAINT "SymptomReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RainfallObservation" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "rainfallMm" DECIMAL(7,2) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'synthetic-imd',

    CONSTRAINT "RainfallObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterQualityObservation" (
    "id" TEXT NOT NULL,
    "waterSourceId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "turbidityNTU" DOUBLE PRECISION,
    "ph" DOUBLE PRECISION,
    "tds" DOUBLE PRECISION,
    "freeChlorine" DOUBLE PRECISION,
    "ecoliDetected" BOOLEAN,
    "inspectionScore" INTEGER,
    "sampleMethod" "SampleMethod" NOT NULL DEFAULT 'DEMO',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "notes" TEXT,

    CONSTRAINT "WaterQualityObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskScore" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "windowHours" INTEGER NOT NULL DEFAULT 72,
    "factors" JSONB NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "warningLevel" "WarningLevel" NOT NULL DEFAULT 'NORMAL',
    "priority" "AlertPriority" NOT NULL DEFAULT 'P3',
    "dominantSyndrome" TEXT NOT NULL DEFAULT 'none',
    "rawMetrics" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "riskScoreId" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "level" "RiskLevel" NOT NULL,
    "score" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "priority" "AlertPriority" NOT NULL DEFAULT 'P3',
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "warningLevel" "WarningLevel" NOT NULL DEFAULT 'NORMAL',
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Location_district_type_idx" ON "Location"("district", "type");

-- CreateIndex
CREATE INDEX "WaterSource_locationId_status_idx" ON "WaterSource"("locationId", "status");

-- CreateIndex
CREATE INDEX "SymptomReport_locationId_reportedAt_idx" ON "SymptomReport"("locationId", "reportedAt");

-- CreateIndex
CREATE INDEX "SymptomReport_phoneHash_reportedAt_idx" ON "SymptomReport"("phoneHash", "reportedAt");

-- CreateIndex
CREATE INDEX "SymptomReport_waterSourceId_idx" ON "SymptomReport"("waterSourceId");

-- CreateIndex
CREATE INDEX "RainfallObservation_locationId_observedAt_idx" ON "RainfallObservation"("locationId", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RainfallObservation_locationId_observedAt_key" ON "RainfallObservation"("locationId", "observedAt");

-- CreateIndex
CREATE INDEX "WaterQualityObservation_waterSourceId_observedAt_idx" ON "WaterQualityObservation"("waterSourceId", "observedAt");

-- CreateIndex
CREATE INDEX "RiskScore_locationId_computedAt_idx" ON "RiskScore"("locationId", "computedAt");

-- CreateIndex
CREATE INDEX "Alert_status_triggeredAt_idx" ON "Alert"("status", "triggeredAt");

-- CreateIndex
CREATE INDEX "Alert_locationId_status_idx" ON "Alert"("locationId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_entity_createdAt_idx" ON "AuditLog"("entity", "createdAt");

-- AddForeignKey
ALTER TABLE "WaterSource" ADD CONSTRAINT "WaterSource_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomReport" ADD CONSTRAINT "SymptomReport_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomReport" ADD CONSTRAINT "SymptomReport_waterSourceId_fkey" FOREIGN KEY ("waterSourceId") REFERENCES "WaterSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RainfallObservation" ADD CONSTRAINT "RainfallObservation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterQualityObservation" ADD CONSTRAINT "WaterQualityObservation_waterSourceId_fkey" FOREIGN KEY ("waterSourceId") REFERENCES "WaterSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskScore" ADD CONSTRAINT "RiskScore_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_riskScoreId_fkey" FOREIGN KEY ("riskScoreId") REFERENCES "RiskScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
