package com.jalrakshak.field.domain.model

data class Worker(
    val id: String,
    val name: String,
    val role: String,
    val assignedArea: String,
    val locationId: String?,
    val token: String,
)