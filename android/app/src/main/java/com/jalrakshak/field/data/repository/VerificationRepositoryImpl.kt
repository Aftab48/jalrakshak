package com.jalrakshak.field.data.repository

import android.content.Context
import com.jalrakshak.field.data.local.database.AppDatabase
import com.jalrakshak.field.data.local.entity.LocalVerification
import com.jalrakshak.field.domain.model.Verification
import com.jalrakshak.field.domain.repository.VerificationRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID

class VerificationRepositoryImpl(
    private val context: Context,
    private val database: AppDatabase,
) : VerificationRepository {

    private val verificationDao = database.verificationDao()

    override suspend fun submit(verification: Verification) {
        val id = if (verification.id.isBlank()) UUID.randomUUID().toString() else verification.id
        verificationDao.insert(
            LocalVerification(
                id = id,
                alertId = verification.alertId,
                casesPresent = verification.casesPresent,
                affectedPeople = verification.affectedPeople,
                affectedHouseholds = verification.affectedHouseholds,
                symptoms = verification.symptoms,
                waterSourceId = verification.waterSourceId,
                waterCondition = verification.waterCondition,
                notes = verification.notes,
                latitude = verification.latitude,
                longitude = verification.longitude,
                photoPath = verification.photoPath,
            )
        )
    }

    override fun observeAll(): Flow<List<Verification>> =
        verificationDao.observeAll().map { list -> list.map { it.toDomain() } }

    override fun observePendingCount(): Flow<Int> =
        verificationDao.observeAll().map { list -> list.count { it.syncState == "PENDING_SYNC" } }
}

fun LocalVerification.toDomain(): Verification = Verification(
    id = id,
    alertId = alertId,
    casesPresent = casesPresent,
    affectedPeople = affectedPeople,
    affectedHouseholds = affectedHouseholds,
    symptoms = symptoms,
    waterSourceId = waterSourceId,
    waterCondition = waterCondition,
    notes = notes,
    latitude = latitude,
    longitude = longitude,
    photoPath = photoPath,
)