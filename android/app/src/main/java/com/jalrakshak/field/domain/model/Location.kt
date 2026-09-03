package com.jalrakshak.field.domain.model

data class Location(
    val id: String,
    val name: String,
    val district: String,
    val state: String,
    val type: String,
    val latitude: Double,
    val longitude: Double,
    val population: Int,
    val households: Int,
    val waterSources: List<WaterSourceSummary> = emptyList(),
    val risk: Risk? = null,
    val rainfallMm72h: Double? = null,
)

data class WaterSourceSummary(
    val id: String,
    val name: String,
    val type: String,
    val status: String,
)