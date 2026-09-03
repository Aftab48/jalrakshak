package com.jalrakshak.field.domain.model

import org.junit.Assert.assertEquals
import org.junit.Test

class SymptomVocabularyTest {

    @Test
    fun `contains all canonical symptoms`() {
        assertEquals(8, SymptomVocabulary.symptoms.size)
        assertEquals("diarrhoea", SymptomVocabulary.symptoms.first())
        assertEquals("dehydration", SymptomVocabulary.symptoms.last())
    }

    @Test
    fun `contains all age bands`() {
        assertEquals(
            listOf("0-5", "6-14", "15-45", "46-65", "65+"),
            SymptomVocabulary.ageBands,
        )
    }

    @Test
    fun `display name for diarrhoea is capitalized`() {
        assertEquals("Diarrhea", SymptomVocabulary.displayName("diarrhoea"))
    }

    @Test
    fun `display name converts underscores to spaces`() {
        assertEquals("Abdominal Pain", SymptomVocabulary.displayName("stomach_pain"))
    }

    @Test
    fun `display name capitalizes first letter`() {
        assertEquals("Fever", SymptomVocabulary.displayName("fever"))
    }
}
