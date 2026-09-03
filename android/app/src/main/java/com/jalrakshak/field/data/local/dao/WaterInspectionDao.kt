package com.jalrakshak.field.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.jalrakshak.field.data.local.entity.LocalWaterInspection
import kotlinx.coroutines.flow.Flow

@Dao
interface WaterInspectionDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(inspection: LocalWaterInspection)

    @Query("SELECT * FROM local_water_inspections ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<LocalWaterInspection>>

    @Query("SELECT * FROM local_water_inspections ORDER BY createdAt DESC")
    suspend fun getAll(): List<LocalWaterInspection>

    @Query("SELECT * FROM local_water_inspections WHERE syncState = 'PENDING_SYNC' ORDER BY createdAt ASC")
    suspend fun getPending(): List<LocalWaterInspection>

    @Query("UPDATE local_water_inspections SET syncState = :state WHERE id = :id")
    suspend fun updateSyncState(id: String, state: String)

    @Query("DELETE FROM local_water_inspections WHERE id = :id")
    suspend fun delete(id: String)

    @Query("SELECT COUNT(*) FROM local_water_inspections WHERE syncState = 'PENDING_SYNC'")
    fun observePendingCount(): Flow<Int>
}