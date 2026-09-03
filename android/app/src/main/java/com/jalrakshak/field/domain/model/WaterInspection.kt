package com.jalrakshak.field.domain.model

data class WaterInspection(
    val id: String,
    val waterSourceId: String,
    val waterSourceName: String? = null,
    val observedAt: String,
    val turbidityNTU: Double? = null,
    val ph: Double? = null,
    val tds: Double? = null,
    val freeChlorine: Double? = null,
    val ecoliDetected: Boolean? = null,
    val visualCondition: String? = null,
    val notes: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val photoPath: String? = null,
)