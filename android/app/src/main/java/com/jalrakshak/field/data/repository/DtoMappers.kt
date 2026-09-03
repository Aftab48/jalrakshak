package com.jalrakshak.field.data.repository

import com.jalrakshak.field.data.remote.dto.AlertDetailDto
import com.jalrakshak.field.data.remote.dto.AlertDto
import com.jalrakshak.field.data.remote.dto.LocationDto
import com.jalrakshak.field.data.remote.dto.RiskDto
import com.jalrakshak.field.data.remote.dto.WaterSourceDto
import com.jalrakshak.field.data.remote.dto.WaterQualityDto
import com.jalrakshak.field.domain.model.Alert
import com.jalrakshak.field.domain.model.Location
import com.jalrakshak.field.domain.model.LocationMinimal
import com.jalrakshak.field.domain.model.Risk
import com.jalrakshak.field.domain.model.WaterQualityObservation
import com.jalrakshak.field.domain.model.WaterSource

fun LocationDto.toDomain(): Location = Location(
    id = id,
    name = name,
    district = district,
    state = state,
    type = type,
    latitude = latitude,
    longitude = longitude,
    population = population,
    households = households,
    waterSources = waterSources.map { ws ->
        com.jalrakshak.field.domain.model.WaterSourceSummary(
            id = ws.id,
            name = ws.name,
            type = ws.type,
            status = ws.status,
        )
    },
    risk = risk?.toDomain(),
    rainfallMm72h = rainfallMm72h,
)

fun RiskDto.toDomain(): Risk = Risk(
    score = score,
    level = level,
    confidence = confidence,
    warningLevel = warningLevel,
    priority = priority,
    dominantSyndrome = dominantSyndrome,
    factors = factors,
    reasoning = reasoning,
)

fun com.jalrakshak.field.data.remote.dto.LocationMinimalDto.toDomain(): LocationMinimal = LocationMinimal(
    id = id,
    name = name,
    district = district,
    latitude = latitude,
    longitude = longitude,
)

fun AlertDto.toDomain(): Alert = Alert(
    id = id,
    status = status,
    level = level,
    score = score,
    priority = priority,
    confidence = confidence,
    warningLevel = warningLevel,
    title = title,
    message = message,
    recommendedAction = recommendedAction,
    triggeredAt = triggeredAt,
    acknowledgedAt = acknowledgedAt,
    resolvedAt = resolvedAt,
    location = location?.toDomain(),
    dominantSyndrome = dominantSyndrome,
    reasoning = reasoning,
)

fun AlertDetailDto.toDomain(): Alert = Alert(
    id = id,
    status = status,
    level = level,
    score = score,
    priority = priority,
    confidence = confidence,
    warningLevel = warningLevel,
    title = title,
    message = message,
    recommendedAction = recommendedAction,
    triggeredAt = triggeredAt,
    acknowledgedAt = acknowledgedAt,
    resolvedAt = resolvedAt,
    location = location.toDomain(),
    dominantSyndrome = dominantSyndrome,
    reasoning = reasoning,
    factors = factors,
)

fun WaterSourceDto.toDomain(): WaterSource = WaterSource(
    id = id,
    name = name,
    type = type,
    status = status,
    lastInspectedAt = lastInspectedAt,
    notes = notes,
    location = location?.toDomain(),
    latestObservation = latestObservation?.toDomain(),
    observations = observations.map { it.toDomain() },
)

fun WaterQualityDto.toDomain(): WaterQualityObservation = WaterQualityObservation(
    id = id,
    observedAt = observedAt,
    turbidityNTU = turbidityNTU,
    ph = ph,
    tds = tds,
    freeChlorine = freeChlorine,
    ecoliDetected = ecoliDetected,
    inspectionScore = inspectionScore,
    sampleMethod = sampleMethod,
    confidence = confidence,
    notes = notes,
)