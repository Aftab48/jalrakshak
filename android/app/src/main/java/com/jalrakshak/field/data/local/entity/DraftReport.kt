package com.jalrakshak.field.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "draft_reports")
data class DraftReport(
    @PrimaryKey val id: String,
    val type: String,
    val data: String,
    val updatedAt: Long = System.currentTimeMillis(),
)