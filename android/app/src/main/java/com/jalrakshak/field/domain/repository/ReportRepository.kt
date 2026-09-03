package com.jalrakshak.field.domain.repository

import com.jalrakshak.field.domain.model.HealthReport
import kotlinx.coroutines.flow.Flow
import java.io.File

interface ReportRepository {
    fun observeReports(): Flow<List<HealthReport>>
    fun observePendingCount(): Flow<Int>
    fun saveDraft(report: HealthReport)
    suspend fun loadDraft(): HealthReport?
    suspend fun clearDraft()
    suspend fun submit(report: HealthReport): String
    suspend fun submitOffline(report: HealthReport)
    suspend fun savePhoto(reportId: String, photo: File): String?
}