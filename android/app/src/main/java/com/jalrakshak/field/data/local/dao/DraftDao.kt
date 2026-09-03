package com.jalrakshak.field.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.jalrakshak.field.data.local.entity.DraftReport
import kotlinx.coroutines.flow.Flow

@Dao
interface DraftDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(draft: DraftReport)

    @Query("SELECT * FROM draft_reports WHERE type = :type")
    suspend fun get(type: String): DraftReport?

    @Query("SELECT * FROM draft_reports")
    fun observeAll(): Flow<List<DraftReport>>

    @Query("DELETE FROM draft_reports WHERE type = :type")
    suspend fun delete(type: String)
}