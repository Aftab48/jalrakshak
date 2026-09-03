package com.jalrakshak.field.domain.model

data class WaterSource(
    val id: String,
    val name: String,
    val type: String,
    val status: String,
    val lastInspectedAt: String? = null,
    val notes: String? = null,
    val location: LocationMinimal? = null,
    val latestObservation: WaterQualityObservation? = null,
    val observations: List<WaterQualityObservation> = emptyList(),
)

data class LocationMinimal(
    val id: String,
    val name: String,
    val district: String,
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
)

data class WaterQualityObservation(
    val id: String? = null,
    val observedAt: String? = null,
    val turbidityNTU: Double? = null,
    val ph: Double? = null,
    val tds: Double? = null,
    val freeChlorine: Double? = null,
    val ecoliDetected: Boolean? = null,
    val inspectionScore: Int? = null,
    val sampleMethod: String? = null,
    val confidence: Double? = null,
    val notes: String? = null,
)