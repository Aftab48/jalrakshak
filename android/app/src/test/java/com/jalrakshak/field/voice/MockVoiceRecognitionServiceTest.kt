package com.jalrakshak.field.voice

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MockVoiceRecognitionServiceTest {

    private val service = MockVoiceRecognitionService()

    @Test
    fun `detects English by default`() = runBlocking {
        val result = service.transcribeAndParse("Patient has diarrhea and fever since two days")
        assertEquals("en", result.language)
    }

    @Test
    fun `extracts English symptoms`() = runBlocking {
        val result = service.transcribeAndParse("Patient has vomiting and fever")
        assertTrue(result.symptoms.contains("vomiting"))
        assertTrue(result.symptoms.contains("fever"))
    }

    @Test
    fun `extracts Bengali symptoms and language`() = runBlocking {
        val result = service.transcribeAndParse("রোগীর জ্বর এবং ডায়রিয়া হয়েছে")
        assertEquals("bn", result.language)
        assertTrue(result.symptoms.contains("fever"))
        assertTrue(result.symptoms.contains("diarrhoea"))
    }

    @Test
    fun `extracts duration from digit`() = runBlocking {
        val result = service.transcribeAndParse("diarrhea for 4 days")
        assertEquals(4, result.durationDays)
    }

    @Test
    fun `extracts duration from number word`() = runBlocking {
        val result = service.transcribeAndParse("stomach pain for two days")
        assertEquals(2, result.durationDays)
    }

    @Test
    fun `escalates severity for dehydration`() = runBlocking {
        val result = service.transcribeAndParse("Dehydration and vomiting")
        assertEquals(4, result.severity)
    }

    @Test
    fun `keeps normal severity for mild symptoms`() = runBlocking {
        val result = service.transcribeAndParse("mild headache")
        assertEquals(2, result.severity)
    }

    @Test
    fun `returns empty symptom list when none detected`() = runBlocking {
        val result = service.transcribeAndParse("nothing relevant here")
        assertTrue(result.symptoms.isEmpty())
    }

    @Test
    fun `flags result as simulated`() = runBlocking {
        val result = service.transcribeAndParse("fever")
        assertTrue(result.isSimulated)
    }
}
