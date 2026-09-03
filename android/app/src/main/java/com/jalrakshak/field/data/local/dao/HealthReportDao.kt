package com.jalrakshak.field.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.jalrakshak.field.data.local.entity.LocalHealthReport
import kotlinx.coroutines.flow.Flow

@Dao
interface HealthReportDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(report: LocalHealthReport)

    @Query("SELECT * FROM local_health_reports ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<LocalHealthReport>>

    @Query("SELECT * FROM local_health_reports ORDER BY createdAt DESC")
    suspend fun getAll(): List<LocalHealthReport>

    @Query("SELECT * FROM local_health_reports WHERE syncState = 'PENDING_SYNC' ORDER BY createdAt ASC")
    suspend fun getPending(): List<LocalHealthReport>

    @Query("UPDATE local_health_reports SET syncState = :state WHERE clientReportId = :id")
    suspend fun updateSyncState(id: String, state: String)

    @Query("DELETE FROM local_health_reports WHERE clientReportId = :id")
    suspend fun delete(id: String)

    @Query("SELECT COUNT(*) FROM local_health_reports WHERE syncState = 'PENDING_SYNC'")
    fun observePendingCount(): Flow<Int>
}