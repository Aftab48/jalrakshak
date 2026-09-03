package com.jalrakshak.field.domain.repository

import com.jalrakshak.field.domain.model.Verification
import kotlinx.coroutines.flow.Flow

interface VerificationRepository {
    suspend fun submit(verification: Verification)
    fun observeAll(): Flow<List<Verification>>
    fun observePendingCount(): Flow<Int>
}