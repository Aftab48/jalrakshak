package com.jalrakshak.field.data.repository

import android.content.Context
import com.jalrakshak.field.data.local.database.AppDatabase
import com.jalrakshak.field.data.local.entity.LocalWaterInspection
import com.jalrakshak.field.data.remote.ApiClient
import com.jalrakshak.field.domain.model.WaterInspection
import com.jalrakshak.field.domain.model.WaterSource
import com.jalrakshak.field.domain.repository.WaterRepository
import kotlinx.coroutines.flow.Flow
import java.util.UUID

class WaterRepositoryImpl(
    private val context: Context,
    private val database: AppDatabase,
    private val apiClient: ApiClient,
) : WaterRepository {

    private val inspectionDao = database.waterInspectionDao()

    override suspend fun getWaterSources(locationId: String?): Result<List<WaterSource>> {
        return runCatching {
            val response = apiClient.api.getWaterSources(locationId)
            if (!response.ok) throw Exception(response.error ?: "Failed to load water sources")
            response.waterSources.map { it.toDomain() }
        }
    }

    override suspend fun submitInspection(inspection: WaterInspection): String {
        // Always store locally first (offline-first). Sync uploads later.
        val id = if (inspection.id.isBlank()) UUID.randomUUID().toString() else inspection.id
        inspectionDao.insert(inspection.toLocalEntity(id))
        return id
    }

    override val pendingInspectionCount: Flow<Int> = inspectionDao.observePendingCount()
}

fun WaterInspection.toLocalEntity(id: String): LocalWaterInspection = LocalWaterInspection(
    id = id,
    waterSourceId = waterSourceId,
    waterSourceName = waterSourceName,
    observedAt = observedAt,
    turbidityNTU = turbidityNTU,
    ph = ph,
    tds = tds,
    freeChlorine = freeChlorine,
    ecoliDetected = ecoliDetected,
    visualCondition = visualCondition,
    notes = notes,
    latitude = latitude,
    longitude = longitude,
    photoPath = photoPath,
)