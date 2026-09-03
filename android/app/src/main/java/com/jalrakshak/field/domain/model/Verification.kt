package com.jalrakshak.field.domain.model

data class Verification(
    val id: String,
    val alertId: String,
    val casesPresent: String,
    val affectedPeople: Int? = null,
    val affectedHouseholds: Int? = null,
    val symptoms: List<String> = emptyList(),
    val waterSourceId: String? = null,
    val waterCondition: String? = null,
    val notes: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val photoPath: String? = null,
)