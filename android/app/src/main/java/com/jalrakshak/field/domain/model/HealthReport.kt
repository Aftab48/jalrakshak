package com.jalrakshak.field.domain.model

data class HealthReport(
    val id: String,
    val locationId: String? = null,
    val locationName: String? = null,
    val waterSourceId: String? = null,
    val source: String = "HEALTH_WORKER",
    val ageBand: String? = null,
    val symptoms: List<String>,
    val severity: Int,
    val onsetAt: String,
    val notes: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val reportedAt: String? = null,
    val affectedPeople: Int? = null,
)

object SymptomVocabulary {
    val symptoms = listOf(
        "diarrhoea",
        "vomiting",
        "fever",
        "stomach_pain",
        "headache",
        "weakness",
        "jaundice",
        "dehydration",
    )

    val ageBands = listOf(
        "0-5",
        "6-14",
        "15-45",
        "46-65",
        "65+",
    )

    fun displayName(symptom: String): String = when (symptom) {
        "diarrhoea" -> "Diarrhea"
        "stomach_pain" -> "Abdominal Pain"
        else -> symptom.replace("_", " ").replaceFirstChar { it.uppercase() }
    }
}