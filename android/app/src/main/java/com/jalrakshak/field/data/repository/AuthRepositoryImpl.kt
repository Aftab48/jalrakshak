package com.jalrakshak.field.data.repository

import android.content.Context
import com.jalrakshak.field.data.remote.ApiClient
import com.jalrakshak.field.data.remote.dto.LoginRequest
import com.jalrakshak.field.domain.model.Worker
import com.jalrakshak.field.domain.repository.AuthRepository
import kotlinx.coroutines.flow.Flow

class AuthRepositoryImpl(
    private val context: Context,
    private val apiClient: ApiClient,
) : AuthRepository {

    private val settings = SettingsRepository(context)

    override val isLoggedIn: Flow<Boolean> = settings.isLoggedIn
    override val workerName: Flow<String> = settings.workerName
    override val workerRole: Flow<String> = settings.workerRole
    override val workerId: Flow<String> = settings.workerId
    override val assignedArea: Flow<String> = settings.assignedArea
    override val assignedLocationId: Flow<String> = settings.assignedLocationId
    override val token: Flow<String> = settings.token

    override suspend fun login(workerId: String, pin: String): Result<Worker> {
        return try {
            val response = apiClient.api.login(LoginRequest(workerId = workerId, pin = pin))
            if (response.ok && response.token != null && response.worker != null) {
                val dto = response.worker
                val worker = Worker(
                    id = dto.id,
                    name = dto.name,
                    role = dto.role,
                    assignedArea = dto.assignedArea,
                    locationId = dto.locationId,
                    token = response.token,
                )
                settings.saveWorker(
                    id = worker.id,
                    name = worker.name,
                    role = worker.role,
                    token = worker.token,
                    assignedArea = worker.assignedArea,
                    assignedLocationId = worker.locationId.orEmpty(),
                )
                Result.success(worker)
            } else {
                Result.failure(Exception(response.error ?: "Login failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun logout() {
        settings.clearWorker()
    }
}