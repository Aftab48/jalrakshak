package com.jalrakshak.field.data.repository

import com.jalrakshak.field.data.remote.dto.AlertDto
import com.jalrakshak.field.data.remote.dto.LocationMinimalDto
import com.jalrakshak.field.data.remote.dto.LocationDto
import com.jalrakshak.field.data.remote.dto.RiskDto
import com.jalrakshak.field.data.remote.dto.WaterQualityDto
import com.jalrakshak.field.data.remote.dto.WaterSourceDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DtoMappersTest {

    @Test
    fun `maps location dto to domain`() {
        val dto = LocationDto(
            id = "loc-1",
            name = "Rampura Village",
            district = "Murshidabad",
            state = "West Bengal",
            type = "VILLAGE",
            latitude = 24.1,
            longitude = 88.2,
            population = 5000,
            households = 1000,
        )
        val domain = dto.toDomain()
        assertEquals("loc-1", domain.id)
        assertEquals("Rampura Village", domain.name)
        assertEquals(5000, domain.population)
    }

    @Test
    fun `maps risk dto to domain`() {
        val dto = RiskDto(
            score = 72,
            level = "HIGH",
            confidence = 85,
            warningLevel = "EARLY_WARNING",
            priority = "P1",
            dominantSyndrome = "acute_watery_diarrhoea",
        )
        val domain = dto.toDomain()
        assertEquals(72, domain.score)
        assertEquals("EARLY_WARNING", domain.warningLevel)
        assertEquals("acute_watery_diarrhoea", domain.dominantSyndrome)
    }

    @Test
    fun `maps alert dto to domain including location`() {
        val dto = AlertDto(
            id = "alert-1",
            status = "ACTIVE",
            level = "HIGH",
            score = 80,
            priority = "P0",
            confidence = 90,
            warningLevel = "OUTBREAK",
            title = "Cholera cluster suspected",
            message = "Rising diarrhoea cases",
            recommendedAction = "Verify cases",
            triggeredAt = "2026-01-01T10:00:00Z",
            location = LocationMinimalDto("loc-9", "Beldanga", "Murshidabad"),
        )
        val domain = dto.toDomain()
        assertEquals("alert-1", domain.id)
        assertEquals("loc-9", domain.location?.id)
        assertEquals("Beldanga", domain.location?.name)
        assertEquals("OUTBREAK", domain.warningLevel)
    }

    @Test
    fun `maps water source dto to domain`() {
        val dto = WaterSourceDto(
            id = "ws-1",
            name = "Village Hand Pump 3",
            type = "HAND_PUMP",
            status = "FUNCTIONAL",
            latestObservation = WaterQualityDto(
                turbidityNTU = 12.5,
                ph = 7.1,
                ecoliDetected = false,
            ),
        )
        val domain = dto.toDomain()
        assertEquals("ws-1", domain.id)
        assertEquals(12.5, domain.latestObservation?.turbidityNTU!!, 0.001)
        assertEquals(false, domain.latestObservation?.ecoliDetected)
        assertNull(domain.location)
    }
}
