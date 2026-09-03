package com.jalrakshak.field.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.jalrakshak.field.data.local.entity.LocalVerification
import kotlinx.coroutines.flow.Flow

@Dao
interface VerificationDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(verification: LocalVerification)

    @Query("SELECT * FROM local_verifications ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<LocalVerification>>

    @Query("SELECT * FROM local_verifications WHERE syncState = 'PENDING_SYNC' ORDER BY createdAt ASC")
    suspend fun getPending(): List<LocalVerification>

    @Query("UPDATE local_verifications SET syncState = :state WHERE id = :id")
    suspend fun updateSyncState(id: String, state: String)

    @Query("DELETE FROM local_verifications WHERE id = :id")
    suspend fun delete(id: String)
}