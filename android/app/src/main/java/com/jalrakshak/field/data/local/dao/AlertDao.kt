package com.jalrakshak.field.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.jalrakshak.field.data.local.entity.LocalAlert
import kotlinx.coroutines.flow.Flow

@Dao
interface AlertDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(alert: LocalAlert)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(alerts: List<LocalAlert>)

    @Query("SELECT * FROM local_alerts ORDER BY score DESC")
    fun observeAll(): Flow<List<LocalAlert>>

    @Query("SELECT * FROM local_alerts WHERE status IN ('OPEN', 'ACKNOWLEDGED') ORDER BY score DESC")
    fun observeActive(): Flow<List<LocalAlert>>

    @Query("SELECT * FROM local_alerts WHERE id = :id")
    fun observeById(id: String): Flow<LocalAlert?>

    @Query("SELECT * FROM local_alerts WHERE id = :id")
    suspend fun getById(id: String): LocalAlert?

    @Query("UPDATE local_alerts SET status = :status, acknowledgedAt = :acknowledgedAt, resolvedAt = :resolvedAt WHERE id = :id")
    suspend fun updateStatus(id: String, status: String, acknowledgedAt: String?, resolvedAt: String?)

    @Query("UPDATE local_alerts SET isDirty = 1 WHERE id = :id")
    suspend fun markDirty(id: String)

    @Query("DELETE FROM local_alerts")
    suspend fun clearAll()

    @Query("SELECT COUNT(*) FROM local_alerts WHERE status IN ('OPEN', 'ACKNOWLEDGED')")
    fun observeActiveCount(): Flow<Int>
}