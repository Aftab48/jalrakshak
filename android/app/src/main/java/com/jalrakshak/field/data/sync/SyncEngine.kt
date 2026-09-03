package com.jalrakshak.field.data.sync

import com.jalrakshak.field.data.local.dao.HealthReportDao
import com.jalrakshak.field.data.local.dao.SyncQueueDao
import com.jalrakshak.field.data.local.dao.WaterInspectionDao
import com.jalrakshak.field.data.local.database.AppDatabase
import com.jalrakshak.field.data.remote.ApiClient
import com.jalrakshak.field.data.remote.dto.AlertStatusRequest
import com.jalrakshak.field.data.remote.dto.HealthReportRequest
import com.jalrakshak.field.data.remote.dto.VerificationRequest
import com.jalrakshak.field.data.remote.dto.WaterQualityRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.doubleOrNull
import java.io.IOException

class SyncEngine(
    private val database: AppDatabase,
    private val apiClient: ApiClient,
) {
    private val syncQueueDao: SyncQueueDao = database.syncQueueDao()
    private val healthReportDao: HealthReportDao = database.healthReportDao()
    private val waterInspectionDao: WaterInspectionDao = database.waterInspectionDao()

    private val json = Json { ignoreUnknownKeys = true }

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing

    private val _lastSyncAt = MutableStateFlow<Long?>(null)
    val lastSyncAt: StateFlow<Long?> = _lastSyncAt

    suspend fun sync(): Result<Int> = withContext(Dispatchers.IO) {
        if (_isSyncing.value) return@withContext Result.success(0)
        _isSyncing.value = true
        try {
            var synced = 0

            val pendingReports = healthReportDao.getPending()
            for (report in pendingReports) {
                try {
                    val response = apiClient.api.submitReport(
                        HealthReportRequest(
                            locationId = report.locationId,
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
                    if (response.ok) {
                        healthReportDao.updateSyncState(report.clientReportId, "SYNCED")
                        synced++
                    } else {
                        healthReportDao.updateSyncState(report.clientReportId, "FAILED")
                    }
                } catch (e: IOException) {
                    throw e
                } catch (e: Exception) {
                    healthReportDao.updateSyncState(report.clientReportId, "FAILED")
                }
            }

            val pendingInspections = waterInspectionDao.getPending()
            for (inspection in pendingInspections) {
                try {
                    val response = apiClient.api.submitWaterQuality(
                        WaterQualityRequest(
                            waterSourceId = inspection.waterSourceId,
                            observedAt = inspection.observedAt,
                            turbidityNTU = inspection.turbidityNTU,
                            ph = inspection.ph,
                            tds = inspection.tds,
                            freeChlorine = inspection.freeChlorine,
                            ecoliDetected = inspection.ecoliDetected,
                            sampleMethod = "FIELD_TEST",
                            confidence = 0.7,
                            notes = inspection.notes,
                        )
                    )
                    if (response.ok) {
                        waterInspectionDao.updateSyncState(inspection.id, "SYNCED")
                        synced++
                    } else {
                        waterInspectionDao.updateSyncState(inspection.id, "FAILED")
                    }
                } catch (e: IOException) {
                    throw e
                } catch (e: Exception) {
                    waterInspectionDao.updateSyncState(inspection.id, "FAILED")
                }
            }

            val pendingQueue = syncQueueDao.getPendingItems()
            for (item in pendingQueue) {
                try {
                    when (item.entityType) {
                        VERIFICATION_TYPE -> {
                            val payload = VerificationPayload.fromJson(item.payload)
                            val response = apiClient.api.submitVerification(
                                VerificationRequest(
                                    alertId = payload.alertId,
                                    casesPresent = payload.casesPresent,
                                    affectedPeople = payload.affectedPeople,
                                    affectedHouseholds = payload.affectedHouseholds,
                                    symptoms = payload.symptoms,
                                    waterSourceId = payload.waterSourceId,
                                    waterCondition = payload.waterCondition,
                                    notes = payload.notes,
                                    latitude = payload.latitude,
                                    longitude = payload.longitude,
                                )
                            )
                            if (response.ok) {
                                syncQueueDao.updateState(item.id, "SYNCED")
                                synced++
                            } else {
                                syncQueueDao.updateState(item.id, "FAILED", response.error)
                            }
                        }

                        ALERT_STATUS_TYPE -> {
                            val payload = AlertStatusPayload.fromJson(item.payload)
                            val response = apiClient.api.updateAlertStatus(
                                id = payload.alertId,
                                body = AlertStatusRequest(payload.status),
                            )
                            if (response.ok) {
                                syncQueueDao.updateState(item.id, "SYNCED")
                                synced++
                            } else {
                                syncQueueDao.updateState(item.id, "FAILED", response.error)
                            }
                        }
                    }
                } catch (e: IOException) {
                    throw e
                } catch (e: Exception) {
                    syncQueueDao.updateState(item.id, "FAILED", e.message)
                }
            }

            if (synced > 0) {
                _lastSyncAt.value = System.currentTimeMillis()
            }
            Result.success(synced)
        } finally {
            _isSyncing.value = false
        }
    }

    companion object {
        const val VERIFICATION_TYPE = "VERIFICATION"
        const val ALERT_STATUS_TYPE = "ALERT_STATUS"
    }
}

data class VerificationPayload(
    val alertId: String,
    val casesPresent: String,
    val affectedPeople: Int?,
    val affectedHouseholds: Int?,
    val symptoms: List<String>,
    val waterSourceId: String?,
    val waterCondition: String?,
    val notes: String?,
    val latitude: Double?,
    val longitude: Double?,
) {
    companion object {
        fun fromJson(payload: String): VerificationPayload {
            val obj = Json { ignoreUnknownKeys = true }.parseToJsonElement(payload).jsonObject
            return VerificationPayload(
                alertId = obj["alertId"]!!.jsonPrimitive.content,
                casesPresent = obj["casesPresent"]!!.jsonPrimitive.content,
                affectedPeople = obj["affectedPeople"]?.jsonPrimitive?.intOrNull,
                affectedHouseholds = obj["affectedHouseholds"]?.jsonPrimitive?.intOrNull,
                symptoms = obj["symptoms"]?.jsonArray?.map { it.jsonPrimitive.content } ?: emptyList(),
                waterSourceId = obj["waterSourceId"]?.jsonPrimitive?.contentOrNull,
                waterCondition = obj["waterCondition"]?.jsonPrimitive?.contentOrNull,
                notes = obj["notes"]?.jsonPrimitive?.contentOrNull,
                latitude = obj["latitude"]?.jsonPrimitive?.doubleOrNull,
                longitude = obj["longitude"]?.jsonPrimitive?.doubleOrNull,
            )
        }
    }
}

data class AlertStatusPayload(
    val alertId: String,
    val status: String,
) {
    companion object {
        fun fromJson(payload: String): AlertStatusPayload {
            val obj = Json { ignoreUnknownKeys = true }.parseToJsonElement(payload).jsonObject
            return AlertStatusPayload(
                alertId = obj["alertId"]!!.jsonPrimitive.content,
                status = obj["status"]!!.jsonPrimitive.content,
            )
        }
    }
}