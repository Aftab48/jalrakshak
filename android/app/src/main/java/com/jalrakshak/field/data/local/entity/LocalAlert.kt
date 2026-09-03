package com.jalrakshak.field.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "local_alerts")
data class LocalAlert(
    @PrimaryKey val id: String,
    val status: String,
    val level: String,
    val score: Int,
    val priority: String,
    val confidence: Int,
    val warningLevel: String,
    val title: String,
    val message: String,
    val recommendedAction: String,
    val triggeredAt: String,
    val acknowledgedAt: String? = null,
    val resolvedAt: String? = null,
    val locationId: String? = null,
    val locationName: String? = null,
    val dominantSyndrome: String? = null,
    val reasoning: String? = null,
    val isDirty: Boolean = false,
    val cachedAt: Long = System.currentTimeMillis(),
)