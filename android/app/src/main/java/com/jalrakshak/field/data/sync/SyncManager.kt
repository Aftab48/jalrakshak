package com.jalrakshak.field.data.sync

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.jalrakshak.field.data.local.database.AppDatabase
import com.jalrakshak.field.data.remote.ApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

class SyncManager(
    private val context: Context,
    private val database: AppDatabase,
    private val apiClient: ApiClient,
) {
    private val syncEngine = SyncEngine(database, apiClient)
    private val networkMonitor = NetworkMonitor(context)
    private val reportDao = database.healthReportDao()
    private val inspectionDao = database.waterInspectionDao()
    private val syncQueueDao = database.syncQueueDao()

    private val _pendingReports = MutableStateFlow(0)
    val pendingReports: StateFlow<Int> = _pendingReports

    private val _pendingInspections = MutableStateFlow(0)
    val pendingInspections: StateFlow<Int> = _pendingInspections

    private val _pendingSync = MutableStateFlow(0)
    val pendingSync: StateFlow<Int> = _pendingSync

    private val _failedSync = MutableStateFlow(0)
    val failedSync: StateFlow<Int> = _failedSync

    private val _syncing = MutableStateFlow(false)
    val syncing: StateFlow<Boolean> = _syncing

    private val _lastSyncedAt = MutableStateFlow<Long?>(null)
    val lastSyncedAt: StateFlow<Long?> = _lastSyncedAt

    suspend fun initialize() {
        coroutineScope {
            launch {
                combine(reportDao.observePendingCount(), inspectionDao.observePendingCount(), syncQueueDao.observePendingCount()) { reports, inspections, queue ->
                    Triple(reports, inspections, queue)
                }.collect { (reports, inspections, queue) ->
                    _pendingReports.value = reports
                    _pendingInspections.value = inspections
                    _pendingSync.value = reports + inspections + queue
                }
            }
            launch {
                syncQueueDao.observeFailedCount().collect { _failedSync.value = it }
            }
            launch {
                syncEngine.isSyncing.collect { _syncing.value = it }
            }
            launch {
                syncEngine.lastSyncAt.collect { _lastSyncedAt.value = it }
            }
        }
    }

    suspend fun syncNow(): Result<Int> {
        if (!networkMonitor.currentlyOnline()) {
            return Result.failure(Exception("OFFLINE"))
        }
        val result = syncEngine.sync()
        context.applicationContext.sendBroadcast(android.content.Intent("com.jalrakshak.field.SYNC_COMPLETE"))
        return result
    }

    fun isOnline(): Boolean = networkMonitor.currentlyOnline()

    fun observeNetwork(): kotlinx.coroutines.flow.Flow<Boolean> = networkMonitor.isOnline

    fun enqueuePeriodicSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val request = PeriodicWorkRequestBuilder<SyncWorker>(30, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "jalrakshak-sync",
            ExistingPeriodicWorkPolicy.KEEP,
            request,
        )
    }

    fun enqueueImmediateSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val request = androidx.work.OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()

        WorkManager.getInstance(context).enqueue(request)
    }
}