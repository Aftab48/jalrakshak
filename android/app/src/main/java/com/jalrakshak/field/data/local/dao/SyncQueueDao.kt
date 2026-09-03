package com.jalrakshak.field.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.jalrakshak.field.data.local.entity.SyncQueueItem
import kotlinx.coroutines.flow.Flow

@Dao
interface SyncQueueDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: SyncQueueItem): Long

    @Query("SELECT * FROM sync_queue WHERE state = 'PENDING_SYNC' ORDER BY createdAt ASC")
    suspend fun getPendingItems(): List<SyncQueueItem>

    @Query("SELECT * FROM sync_queue WHERE state != 'SYNCED' ORDER BY createdAt ASC")
    fun observePendingItems(): Flow<List<SyncQueueItem>>

    @Query("SELECT COUNT(*) FROM sync_queue WHERE state = 'PENDING_SYNC'")
    fun observePendingCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM sync_queue WHERE state = 'FAILED'")
    fun observeFailedCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM sync_queue WHERE state = 'SYNCING'")
    fun observeSyncingCount(): Flow<Int>

    @Query("SELECT * FROM sync_queue")
    suspend fun getAll(): List<SyncQueueItem>

    @Query("UPDATE sync_queue SET state = :state, lastError = :error, updatedAt = :updatedAt WHERE id = :id")
    suspend fun updateState(id: Long, state: String, error: String? = null, updatedAt: Long = System.currentTimeMillis())

    @Query("UPDATE sync_queue SET attempts = attempts + 1, updatedAt = :updatedAt WHERE id = :id")
    suspend fun incrementAttempts(id: Long, updatedAt: Long = System.currentTimeMillis())

    @Query("DELETE FROM sync_queue WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("DELETE FROM sync_queue WHERE state = 'SYNCED'")
    suspend fun deleteSynced()
}