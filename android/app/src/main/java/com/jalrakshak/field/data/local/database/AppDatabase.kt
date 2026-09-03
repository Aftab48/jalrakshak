package com.jalrakshak.field.data.local.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.jalrakshak.field.data.local.dao.AlertDao
import com.jalrakshak.field.data.local.dao.DraftDao
import com.jalrakshak.field.data.local.dao.HealthReportDao
import com.jalrakshak.field.data.local.dao.SyncQueueDao
import com.jalrakshak.field.data.local.dao.VerificationDao
import com.jalrakshak.field.data.local.dao.WaterInspectionDao
import com.jalrakshak.field.data.local.entity.DraftReport
import com.jalrakshak.field.data.local.entity.LocalAlert
import com.jalrakshak.field.data.local.entity.LocalHealthReport
import com.jalrakshak.field.data.local.entity.LocalVerification
import com.jalrakshak.field.data.local.entity.LocalWaterInspection
import com.jalrakshak.field.data.local.entity.SyncQueueItem

@Database(
    entities = [
        SyncQueueItem::class,
        LocalHealthReport::class,
        LocalWaterInspection::class,
        LocalAlert::class,
        LocalVerification::class,
        DraftReport::class,
    ],
    version = 1,
    exportSchema = false,
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {

    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun healthReportDao(): HealthReportDao
    abstract fun waterInspectionDao(): WaterInspectionDao
    abstract fun alertDao(): AlertDao
    abstract fun verificationDao(): VerificationDao
    abstract fun draftDao(): DraftDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "jalrakshak.db",
                )
                    .fallbackToDestructiveMigration()
                    .build()
                    .also { INSTANCE = it }
            }
        }
    }
}