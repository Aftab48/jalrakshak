package com.jalrakshak.field.data.repository

import android.content.Context
import com.jalrakshak.field.data.local.database.AppDatabase
import com.jalrakshak.field.data.local.entity.DraftReport
import com.jalrakshak.field.data.local.entity.LocalHealthReport
import com.jalrakshak.field.data.remote.ApiClient
import com.jalrakshak.field.data.remote.dto.HealthReportRequest
import com.jalrakshak.field.domain.model.HealthReport
import com.jalrakshak.field.domain.repository.ReportRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import java.io.File
import java.util.UUID

class ReportRepositoryImpl(
    private val context: Context,
    private val database: AppDatabase,
    private val apiClient: ApiClient,
) : ReportRepository {

    private val reportDao = database.healthReportDao()
    private val draftDao = database.draftDao()
    private val json = Json { ignoreUnknownKeys = true }

    override fun observeReports(): Flow<List<HealthReport>> =
        reportDao.observeAll().map { list -> list.map { it.toDomain() } }

    override fun observePendingCount(): Flow<Int> = reportDao.observePendingCount()

    override fun saveDraft(report: HealthReport) {
        // Persisted via ViewModel on each field change; kept in memory too.
    }

    override suspend fun loadDraft(): HealthReport? {
        val draft = draftDao.get("health_report") ?: return null
        val parsed = runCatching {
            json.decodeFromString(LocalHealthReport.serializer(), draft.data)
        }.getOrNull()
        return parsed?.toDomain()
    }

    override suspend fun clearDraft() {
        draftDao.delete("health_report")
    }

    override suspend fun submit(report: HealthReport): String {
        val response = apiClient.api.submitReport(
            HealthReportRequest(
                locationId = report.locationId.orEmpty(),
                waterSourceId = report.waterSourceId,
                source = report.source,
                ageBand = report.ageBand,
                symptoms = report.symptoms,
                severity = report.severity,
                onsetAt = report.onsetAt,
                latitude = report.latitude,
                longitude = report.longitude,
                notes = report.notes,
            )
        )
        if (!response.ok) {
            throw Exception(response.error ?: "Report could not be submitted")
        }
        return response.reportId ?: ""
    }

    override suspend fun submitOffline(report: HealthReport) {
        val id = report.id
        reportDao.insert(
            LocalHealthReport(
                clientReportId = id,
                locationId = report.locationId.orEmpty(),
                waterSourceId = report.waterSourceId,
                source = report.source,
                ageBand = report.ageBand,
                symptoms = report.symptoms,
                severity = report.severity,
                onsetAt = report.onsetAt,
                notes = report.notes,
                latitude = report.latitude,
                longitude = report.longitude,
                locationName = report.locationName,
                affectedPeople = report.affectedPeople,
                syncState = "PENDING_SYNC",
            )
        )
    }

    override suspend fun savePhoto(reportId: String, photo: File): String? {
        return runCatching {
            val dir = File(context.filesDir, "evidence")
            if (!dir.exists()) dir.mkdirs()
            val dest = File(dir, "report-$reportId.jpg")
            photo.copyTo(dest, overwrite = true)
            dest.absolutePath
        }.getOrNull()
    }

    suspend fun persistDraft(report: HealthReport) {
        // Only save drafts that are not yet submitted.
        draftDao.upsert(
            DraftReport(
                id = report.id,
                type = "health_report",
                data = json.encodeToString(
                    LocalHealthReport.serializer(),
                    LocalHealthReport(
                        clientReportId = report.id,
                        locationId = report.locationId.orEmpty(),
                        waterSourceId = report.waterSourceId,
                        source = report.source,
                        ageBand = report.ageBand,
                        symptoms = report.symptoms,
                        severity = report.severity,
                        onsetAt = report.onsetAt,
                        notes = report.notes,
                        latitude = report.latitude,
                        longitude = report.longitude,
                        locationName = report.locationName,
                        affectedPeople = report.affectedPeople,
                    )
                ),
            )
        )
    }

    fun newClientReportId(): String = UUID.randomUUID().toString()
}

fun LocalHealthReport.toDomain(): HealthReport = HealthReport(
    id = clientReportId,
    locationId = locationId,
    locationName = locationName,
    waterSourceId = waterSourceId,
    source = source,
    ageBand = ageBand,
    symptoms = symptoms,
    severity = severity,
    onsetAt = onsetAt,
    notes = notes,
    latitude = latitude,
    longitude = longitude,
    affectedPeople = affectedPeople,
)