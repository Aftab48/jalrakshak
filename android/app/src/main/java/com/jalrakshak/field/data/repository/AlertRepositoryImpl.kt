package com.jalrakshak.field.data.repository

import android.content.Context
import com.jalrakshak.field.data.local.database.AppDatabase
import com.jalrakshak.field.data.local.entity.LocalAlert
import com.jalrakshak.field.data.remote.ApiClient
import com.jalrakshak.field.data.remote.dto.AlertDetailDto
import com.jalrakshak.field.data.remote.dto.AlertStatusRequest
import com.jalrakshak.field.data.remote.dto.AlertDto
import com.jalrakshak.field.domain.model.Alert
import com.jalrakshak.field.domain.repository.AlertRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

class AlertRepositoryImpl(
    private val context: Context,
    private val database: AppDatabase,
    private val apiClient: ApiClient,
) : AlertRepository {

    private val alertDao = database.alertDao()

    override fun observeActiveAlerts(): Flow<List<Alert>> =
        alertDao.observeActive().map { list -> list.map { it.toDomain() } }

    override fun observeAlert(id: String): Flow<Alert?> =
        alertDao.observeById(id).map { it?.toDomain() }

    override fun observeActiveCount(): Flow<Int> = alertDao.observeActiveCount()

    override suspend fun refreshAlerts() {
        runCatching {
            val response = apiClient.api.getAlerts()
            if (response.ok) {
                val remote = response.alerts.map { it.toLocalEntity() }
                val local = alertDao.observeAll().first()
                val remoteIds = remote.map { it.id }.toSet()
                // Keep locally dirtied (pending ack/resolve) alerts that are not yet
                // reflected on the server; overwrite everything else with server truth.
                val dirtiedLocal = local.filter { it.isDirty && it.id !in remoteIds }
                alertDao.insertAll(remote + dirtiedLocal)
            }
        }
    }

    override suspend fun refreshAlertDetail(id: String) {
        runCatching {
            val response = apiClient.api.getAlert(id)
            response.alert?.let { dto ->
                alertDao.insert(dto.toLocalEntity())
            }
        }
    }

    override suspend fun acknowledge(id: String) {
        runCatching {
            apiClient.api.updateAlertStatus(id, AlertStatusRequest("ACKNOWLEDGED"))
        }
        alertDao.updateStatus(id, "ACKNOWLEDGED", null, null)
    }

    override suspend fun resolve(id: String) {
        runCatching {
            apiClient.api.updateAlertStatus(id, AlertStatusRequest("RESOLVED"))
        }
        alertDao.updateStatus(id, "RESOLVED", null, null)
    }
}

fun AlertDto.toLocalEntity(): LocalAlert = LocalAlert(
    id = id,
    status = status,
    level = level,
    score = score,
    priority = priority,
    confidence = confidence,
    warningLevel = warningLevel,
    title = title,
    message = message,
    recommendedAction = recommendedAction,
    triggeredAt = triggeredAt,
    acknowledgedAt = acknowledgedAt,
    resolvedAt = resolvedAt,
    locationId = location?.id,
    locationName = location?.name,
    dominantSyndrome = dominantSyndrome,
    reasoning = reasoning,
)

fun AlertDetailDto.toLocalEntity(): LocalAlert = LocalAlert(
    id = id,
    status = status,
    level = level,
    score = score,
    priority = priority,
    confidence = confidence,
    warningLevel = warningLevel,
    title = title,
    message = message,
    recommendedAction = recommendedAction,
    triggeredAt = triggeredAt,
    acknowledgedAt = acknowledgedAt,
    resolvedAt = resolvedAt,
    locationId = location.id,
    locationName = location.name,
    dominantSyndrome = dominantSyndrome,
    reasoning = reasoning,
)

fun Alert.toLocalEntity(): LocalAlert = LocalAlert(
    id = id,
    status = status,
    level = level,
    score = score,
    priority = priority,
    confidence = confidence,
    warningLevel = warningLevel,
    title = title,
    message = message,
    recommendedAction = recommendedAction,
    triggeredAt = triggeredAt,
    acknowledgedAt = acknowledgedAt,
    resolvedAt = resolvedAt,
    locationId = location?.id,
    locationName = location?.name,
    dominantSyndrome = dominantSyndrome,
    reasoning = reasoning,
)

fun LocalAlert.toDomain(): Alert = Alert(
    id = id,
    status = status,
    level = level,
    score = score,
    priority = priority,
    confidence = confidence,
    warningLevel = warningLevel,
    title = title,
    message = message,
    recommendedAction = recommendedAction,
    triggeredAt = triggeredAt,
    acknowledgedAt = acknowledgedAt,
    resolvedAt = resolvedAt,
    location = locationId?.let {
        com.jalrakshak.field.domain.model.LocationMinimal(it, locationName ?: "", "")
    },
    dominantSyndrome = dominantSyndrome,
    reasoning = reasoning,
)