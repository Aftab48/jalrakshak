package com.jalrakshak.field.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class VerificationRequest(
    @SerialName("alertId") val alertId: String,
    @SerialName("casesPresent") val casesPresent: String,
    @SerialName("affectedPeople") val affectedPeople: Int? = null,
    @SerialName("affectedHouseholds") val affectedHouseholds: Int? = null,
    @SerialName("symptoms") val symptoms: List<String> = emptyList(),
    @SerialName("waterSourceId") val waterSourceId: String? = null,
    @SerialName("waterCondition") val waterCondition: String? = null,
    @SerialName("notes") val notes: String? = null,
    @SerialName("latitude") val latitude: Double? = null,
    @SerialName("longitude") val longitude: Double? = null,
    @SerialName("verifiedBy") val verifiedBy: String = "android-field-worker",
)

@Serializable
data class VerificationResponse(
    @SerialName("ok") val ok: Boolean = true,
    @SerialName("verificationId") val verificationId: String? = null,
    @SerialName("error") val error: String? = null,
)