package com.jalrakshak.field.domain.repository

import com.jalrakshak.field.domain.model.Alert
import kotlinx.coroutines.flow.Flow

interface AlertRepository {
    fun observeActiveAlerts(): Flow<List<Alert>>
    fun observeAlert(id: String): Flow<Alert?>
    fun observeActiveCount(): Flow<Int>
    suspend fun refreshAlerts()
    suspend fun refreshAlertDetail(id: String)
    suspend fun acknowledge(id: String)
    suspend fun resolve(id: String)
}