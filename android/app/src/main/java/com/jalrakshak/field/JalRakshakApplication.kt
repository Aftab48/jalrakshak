package com.jalrakshak.field

import android.app.Application
import com.jalrakshak.field.data.local.database.AppDatabase
import com.jalrakshak.field.data.remote.ApiClient
import com.jalrakshak.field.data.repository.AuthRepositoryImpl
import com.jalrakshak.field.data.sync.SyncManager
import com.jalrakshak.field.data.repository.ServiceLocator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

class JalRakshakApplication : Application() {

    val database by lazy { AppDatabase.getInstance(this) }
    val apiClient by lazy { ApiClient(this) }
    val syncManager by lazy { SyncManager(this, database, apiClient) }
    val authRepository by lazy { AuthRepositoryImpl(this, apiClient) }

    val locator by lazy { ServiceLocator(this, database, apiClient) }

    val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
}
