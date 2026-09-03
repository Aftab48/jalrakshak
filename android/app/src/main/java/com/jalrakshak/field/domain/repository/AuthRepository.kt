package com.jalrakshak.field.domain.repository

import com.jalrakshak.field.domain.model.Worker
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    val isLoggedIn: Flow<Boolean>
    val workerName: Flow<String>
    val workerRole: Flow<String>
    val workerId: Flow<String>
    val assignedArea: Flow<String>
    val assignedLocationId: Flow<String>
    val token: Flow<String>
    suspend fun login(workerId: String, pin: String): Result<Worker>
    suspend fun logout()
}