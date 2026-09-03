package com.jalrakshak.field.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Entity(tableName = "local_health_reports")
@Serializable
data class LocalHealthReport(
    @PrimaryKey val clientReportId: String,
    val locationId: String,
    val waterSourceId: String? = null,
    val source: String = "HEALTH_WORKER",
    val ageBand: String? = null,
    val symptoms: List<String>,
    val severity: Int,
    val onsetAt: String,
    val notes: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val locationName: String? = null,
    val affectedPeople: Int? = null,
    val syncState: String = "PENDING_SYNC",
    val createdAt: Long = System.currentTimeMillis(),
)