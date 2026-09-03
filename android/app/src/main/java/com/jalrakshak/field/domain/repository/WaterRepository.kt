package com.jalrakshak.field.domain.repository

import com.jalrakshak.field.domain.model.WaterInspection
import com.jalrakshak.field.domain.model.WaterSource
import kotlinx.coroutines.flow.Flow

interface WaterRepository {
    suspend fun getWaterSources(locationId: String? = null): Result<List<WaterSource>>
    suspend fun submitInspection(inspection: WaterInspection): String
    val pendingInspectionCount: Flow<Int>
}
