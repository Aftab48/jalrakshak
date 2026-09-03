package com.jalrakshak.field.data.repository

import android.content.Context
import com.jalrakshak.field.data.local.database.AppDatabase
import com.jalrakshak.field.data.remote.ApiClient
import com.jalrakshak.field.data.sync.SyncManager
import com.jalrakshak.field.domain.repository.AlertRepository
import com.jalrakshak.field.domain.repository.AuthRepository
import com.jalrakshak.field.domain.repository.ReportRepository
import com.jalrakshak.field.domain.repository.VerificationRepository
import com.jalrakshak.field.domain.repository.WaterRepository

/**
 * Lightweight service locator — sufficient for this SIH demo application while
 * keeping the construction of repositories in one place. A full DI framework is
 * unnecessary overhead here.
 */
class ServiceLocator(
    private val context: Context,
    val database: AppDatabase,
    val apiClient: ApiClient,
) {
    val settingsRepository by lazy { SettingsRepository(context) }
    val authRepository: AuthRepository by lazy { AuthRepositoryImpl(context, apiClient) }
    val alertRepository: AlertRepository by lazy { AlertRepositoryImpl(context, database, apiClient) }
    val reportRepository: ReportRepository by lazy { ReportRepositoryImpl(context, database, apiClient) }
    val waterRepository: WaterRepository by lazy { WaterRepositoryImpl(context, database, apiClient) }
    val verificationRepository: VerificationRepository by lazy { VerificationRepositoryImpl(context, database) }
    val syncManager by lazy { SyncManager(context, database, apiClient) }
}