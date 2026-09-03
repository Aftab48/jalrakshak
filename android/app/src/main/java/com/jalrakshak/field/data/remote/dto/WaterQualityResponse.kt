package com.jalrakshak.field.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class WaterQualityResponse(
    @SerialName("ok") val ok: Boolean = true,
    @SerialName("error") val error: String? = null,
    @SerialName("message") val message: String? = null,
)