package com.jalrakshak.field.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "local_verifications")
data class LocalVerification(
    @PrimaryKey val id: String,
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
    val syncState: String = "PENDING_SYNC",
    val createdAt: Long = System.currentTimeMillis(),
)