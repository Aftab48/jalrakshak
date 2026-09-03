package com.jalrakshak.field.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "local_water_inspections")
data class LocalWaterInspection(
    @PrimaryKey val id: String,
    val waterSourceId: String,
    val waterSourceName: String? = null,
    val observedAt: String = java.time.Instant.now().toString(),
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
    val syncState: String = "PENDING_SYNC",
    val createdAt: Long = System.currentTimeMillis(),
)