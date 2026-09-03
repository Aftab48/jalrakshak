package com.jalrakshak.field.data.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.jalrakshak.field.data.local.database.AppDatabase
import com.jalrakshak.field.data.remote.ApiClient
import java.io.IOException

class SyncWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val database = AppDatabase.getInstance(applicationContext)
        val apiClient = ApiClient(applicationContext)
        val engine = SyncEngine(database, apiClient)
        val monitor = NetworkMonitor(applicationContext)

        if (!monitor.currentlyOnline()) {
            return Result.retry()
        }

        return try {
            val result = engine.sync()
            if (result.isSuccess) {
                Result.success()
            } else {
                Result.retry()
            }
        } catch (e: IOException) {
            Result.retry()
        } catch (e: Exception) {
            Result.failure()
        }
    }
}