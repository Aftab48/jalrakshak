package com.jalrakshak.field.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ApiResponse<T>(
    @SerialName("ok") val ok: Boolean = true,
    @SerialName("error") val error: String? = null,
)

@Serializable
data class LoginRequest(
    @SerialName("workerId") val workerId: String,
    @SerialName("pin") val pin: String,
)

@Serializable
data class LoginResponse(
    @SerialName("ok") val ok: Boolean,
    @SerialName("token") val token: String? = null,
    @SerialName("error") val error: String? = null,
    @SerialName("worker") val worker: WorkerDto? = null,
)

@Serializable
data class WorkerDto(
    @SerialName("id") val id: String,
    @SerialName("name") val name: String,
    @SerialName("role") val role: String,
    @SerialName("assignedArea") val assignedArea: String,
    @SerialName("locationId") val locationId: String? = null,
)

@Serializable
data class LocationsResponse(
    @SerialName("ok") val ok: Boolean = true,
    @SerialName("locations") val locations: List<LocationDto> = emptyList(),
    @SerialName("error") val error: String? = null,
)

@Serializable
data class LocationDto(
    @SerialName("id") val id: String,
    @SerialName("name") val name: String,
    @SerialName("district") val district: String,
    @SerialName("state") val state: String = "West Bengal",
    @SerialName("type") val type: String,
    @SerialName("latitude") val latitude: Double,
    @SerialName("longitude") val longitude: Double,
    @SerialName("population") val population: Int,
    @SerialName("households") val households: Int,
    @SerialName("waterSources") val waterSources: List<WaterSourceSummaryDto> = emptyList(),
    @SerialName("risk") val risk: RiskDto? = null,
    @SerialName("rainfallMm72h") val rainfallMm72h: Double? = null,
)

@Serializable
data class WaterSourceSummaryDto(
    @SerialName("id") val id: String,
    @SerialName("name") val name: String,
    @SerialName("type") val type: String,
    @SerialName("status") val status: String,
)

@Serializable
data class RiskDto(
    @SerialName("score") val score: Int,
    @SerialName("level") val level: String,
    @SerialName("confidence") val confidence: Int,
    @SerialName("warningLevel") val warningLevel: String,
    @SerialName("priority") val priority: String,
    @SerialName("dominantSyndrome") val dominantSyndrome: String? = null,
    @SerialName("factors") val factors: Map<String, Double>? = null,
    @SerialName("reasoning") val reasoning: String? = null,
)

@Serializable
data class AlertsResponse(
    @SerialName("ok") val ok: Boolean = true,
    @SerialName("alerts") val alerts: List<AlertDto> = emptyList(),
    @SerialName("error") val error: String? = null,
)

@Serializable
data class AlertDto(
    @SerialName("id") val id: String,
    @SerialName("status") val status: String,
    @SerialName("level") val level: String,
    @SerialName("score") val score: Int,
    @SerialName("priority") val priority: String,
    @SerialName("confidence") val confidence: Int,
    @SerialName("warningLevel") val warningLevel: String,
    @SerialName("title") val title: String,
    @SerialName("message") val message: String,
    @SerialName("recommendedAction") val recommendedAction: String,
    @SerialName("triggeredAt") val triggeredAt: String,
    @SerialName("acknowledgedAt") val acknowledgedAt: String? = null,
    @SerialName("resolvedAt") val resolvedAt: String? = null,
    @SerialName("location") val location: LocationMinimalDto? = null,
    @SerialName("dominantSyndrome") val dominantSyndrome: String? = null,
    @SerialName("reasoning") val reasoning: String? = null,
)

@Serializable
data class LocationMinimalDto(
    @SerialName("id") val id: String,
    @SerialName("name") val name: String,
    @SerialName("district") val district: String,
    @SerialName("state") val state: String? = null,
    @SerialName("latitude") val latitude: Double = 0.0,
    @SerialName("longitude") val longitude: Double = 0.0,
    @SerialName("population") val population: Int? = null,
    @SerialName("households") val households: Int? = null,
)

@Serializable
data class AlertResponse(
    @SerialName("ok") val ok: Boolean = true,
    @SerialName("alert") val alert: AlertDetailDto? = null,
    @SerialName("error") val error: String? = null,
)

@Serializable
data class AlertDetailDto(
    @SerialName("id") val id: String,
    @SerialName("status") val status: String,
    @SerialName("level") val level: String,
    @SerialName("score") val score: Int,
    @SerialName("priority") val priority: String,
    @SerialName("confidence") val confidence: Int,
    @SerialName("warningLevel") val warningLevel: String,
    @SerialName("title") val title: String,
    @SerialName("message") val message: String,
    @SerialName("recommendedAction") val recommendedAction: String,
    @SerialName("triggeredAt") val triggeredAt: String,
    @SerialName("acknowledgedAt") val acknowledgedAt: String? = null,
    @SerialName("resolvedAt") val resolvedAt: String? = null,
    @SerialName("location") val location: LocationMinimalDto,
    @SerialName("dominantSyndrome") val dominantSyndrome: String? = null,
    @SerialName("reasoning") val reasoning: String? = null,
    @SerialName("factors") val factors: Map<String, Double>? = null,
)

@Serializable
data class WaterSourcesResponse(
    @SerialName("ok") val ok: Boolean = true,
    @SerialName("waterSources") val waterSources: List<WaterSourceDto> = emptyList(),
    @SerialName("error") val error: String? = null,
)

@Serializable
data class WaterSourceDto(
    @SerialName("id") val id: String,
    @SerialName("name") val name: String,
    @SerialName("type") val type: String,
    @SerialName("status") val status: String,
    @SerialName("lastInspectedAt") val lastInspectedAt: String? = null,
    @SerialName("notes") val notes: String? = null,
    @SerialName("location") val location: LocationMinimalDto? = null,
    @SerialName("latestObservation") val latestObservation: WaterQualityDto? = null,
    @SerialName("observations") val observations: List<WaterQualityDto> = emptyList(),
)

@Serializable
data class WaterQualityDto(
    @SerialName("id") val id: String? = null,
    @SerialName("observedAt") val observedAt: String? = null,
    @SerialName("turbidityNTU") val turbidityNTU: Double? = null,
    @SerialName("ph") val ph: Double? = null,
    @SerialName("tds") val tds: Double? = null,
    @SerialName("freeChlorine") val freeChlorine: Double? = null,
    @SerialName("ecoliDetected") val ecoliDetected: Boolean? = null,
    @SerialName("inspectionScore") val inspectionScore: Int? = null,
    @SerialName("sampleMethod") val sampleMethod: String? = null,
    @SerialName("confidence") val confidence: Double? = null,
    @SerialName("notes") val notes: String? = null,
)

@Serializable
data class HealthReportRequest(
    @SerialName("locationId") val locationId: String,
    @SerialName("waterSourceId") val waterSourceId: String? = null,
    @SerialName("source") val source: String = "HEALTH_WORKER",
    @SerialName("ageBand") val ageBand: String? = null,
    @SerialName("symptoms") val symptoms: List<String>,
    @SerialName("severity") val severity: Int,
    @SerialName("onsetAt") val onsetAt: String,
    @SerialName("latitude") val latitude: Double? = null,
    @SerialName("longitude") val longitude: Double? = null,
    @SerialName("notes") val notes: String? = null,
)

@Serializable
data class ReportResponse(
    @SerialName("ok") val ok: Boolean = true,
    @SerialName("reportId") val reportId: String? = null,
    @SerialName("duplicateOfId") val duplicateOfId: String? = null,
    @SerialName("error") val error: String? = null,
)

@Serializable
data class WaterQualityRequest(
    @SerialName("waterSourceId") val waterSourceId: String,
    @SerialName("observedAt") val observedAt: String? = null,
    @SerialName("turbidityNTU") val turbidityNTU: Double? = null,
    @SerialName("ph") val ph: Double? = null,
    @SerialName("tds") val tds: Double? = null,
    @SerialName("freeChlorine") val freeChlorine: Double? = null,
    @SerialName("ecoliDetected") val ecoliDetected: Boolean? = null,
    @SerialName("inspectionScore") val inspectionScore: Int? = null,
    @SerialName("sampleMethod") val sampleMethod: String = "FIELD_TEST",
    @SerialName("confidence") val confidence: Double = 0.7,
    @SerialName("notes") val notes: String? = null,
)

@Serializable
data class AlertStatusRequest(
    @SerialName("status") val status: String,
)

@Serializable
data class AlertStatusResponse(
    @SerialName("ok") val ok: Boolean = true,
    @SerialName("alertId") val alertId: String? = null,
    @SerialName("status") val status: String? = null,
    @SerialName("error") val error: String? = null,
)