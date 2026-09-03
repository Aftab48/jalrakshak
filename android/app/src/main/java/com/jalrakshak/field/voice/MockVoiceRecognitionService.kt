package com.jalrakshak.field.voice

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Demo / simulated voice-intake adapter.
 *
 * This adapter does NOT run real speech recognition. It processes text
 * utterances against the same canonical symptom vocabulary (and mirrored
 * multilingual terms) that the JalRakshak backend voice-intake module uses.
 * Anything produced here is clearly flagged as simulated so a field worker is
 * never misled into thinking a real ASR pipeline ran on-device or in the cloud.
 */
class MockVoiceRecognitionService : VoiceRecognitionService {

    override val name: String = "Demo rule-based adapter (no real ASR)"
    override val isDemo: Boolean = true

    override suspend fun transcribeAndParse(utterance: String): VoiceParseResult =
        withContext(Dispatchers.Default) {
            val language = detectLanguage(utterance)
            val symptoms = extractSymptoms(utterance, language)
            val durationDays = extractDurationDays(utterance)
            val severity = if (symptoms.any { it == "dehydration" || it == "vomiting" }) 4 else 2

            VoiceParseResult(
                language = language,
                text = utterance,
                symptoms = symptoms,
                durationDays = durationDays,
                severity = severity,
                isSimulated = true,
            )
        }

    private fun detectLanguage(text: String): String {
        return when {
            Regex("[\\u0980-\\u09FF]").containsMatchIn(text) -> "bn"
            Regex("[\\u0B00-\\u0B7F]").containsMatchIn(text) -> "ta"
            Regex("[\\u0C00-\\u0C7F]").containsMatchIn(text) -> "te"
            Regex("[\\u0C80-\\u0CFF]").containsMatchIn(text) -> "kn"
            Regex("[\\u0A80-\\u0AFF]").containsMatchIn(text) -> "gu"
            Regex("[\\u0B80-\\u0BFF]").containsMatchIn(text) -> "or"
            Regex("[\\u0900-\\u097F]").containsMatchIn(text) -> {
                if (text.contains("ताप") || text.contains("आहे")) "mr" else "hi"
            }
            else -> "en"
        }
    }

    private fun extractSymptoms(text: String, language: String): List<String> {
        val found = mutableListOf<String>()
        val terms = SYMPTOM_TERMS[language] ?: emptyMap()
        for ((canonical, phrases) in terms) {
            if (phrases.any { text.contains(it) }) {
                found.add(canonical)
            }
        }
        // English fallback for demo convenience
        for ((canonical, phrases) in SYMPTOM_TERMS_EN) {
            if (phrases.any { text.lowercase().contains(it) } && canonical !in found) {
                found.add(canonical)
            }
        }
        return found
    }

    private fun extractDurationDays(text: String): Int? {
        val digit = text.firstOrNull { it.isDigit() }?.digitToIntOrNull()
        if (digit != null) return digit
        val words = NUMBER_WORDS
        for ((word, value) in words) {
            if (text.contains(word, ignoreCase = true)) return value
        }
        return null
    }

    private companion object {
        val SYMPTOM_TERMS: Map<String, Map<String, List<String>>> = mapOf(
            "hi" to mapOf(
                "diarrhoea" to listOf("दस्त", "पेट खराब", "डायरिया"),
                "vomiting" to listOf("उल्टी", "उलटी"),
                "fever" to listOf("बुखार", "ताप"),
                "dehydration" to listOf("कमजोरी", "पानी की कमी"),
                "stomach_pain" to listOf("पेट दर्द", "पेट में दर्द"),
                "headache" to listOf("सिर दर्द"),
                "weakness" to listOf("अशक्तता"),
            ),
            "bn" to mapOf(
                "diarrhoea" to listOf("পেট খারাপ", "ডায়রিয়া", "উদরাময়"),
                "vomiting" to listOf("বমি"),
                "fever" to listOf("জ্বর"),
                "dehydration" to listOf("জলশূন্যতা", "দুর্বলতা"),
                "stomach_pain" to listOf("পেটে ব্যথা", "পেট ব্যথা"),
                "headache" to listOf("মাথা ব্যথা"),
                "nausea" to listOf("বমি বমি ভাব"),
            ),
            "mr" to mapOf(
                "diarrhoea" to listOf("जुलाब", "पोटदुखी", "अतिसार"),
                "vomiting" to listOf("उलटी"),
                "fever" to listOf("ताप", "ज्वर"),
                "stomach_pain" to listOf("पोटदुखी"),
            ),
            "te" to mapOf(
                "diarrhoea" to listOf("అతిసారం", "కడుపు నొప్పి"),
                "vomiting" to listOf("వాంతులు"),
                "fever" to listOf("జ్వరం"),
                "stomach_pain" to listOf("కడుపు నొప్పి"),
            ),
            "ta" to mapOf(
                "diarrhoea" to listOf("வயிற்றுப்போக்கு"),
                "vomiting" to listOf("வாந்தி"),
                "fever" to listOf("காய்ச்சல்"),
                "stomach_pain" to listOf("வயிறு வலி"),
            ),
            "gu" to mapOf(
                "diarrhoea" to listOf("ઝાડા"),
                "vomiting" to listOf("ઊલટી"),
                "fever" to listOf("તાવ"),
                "stomach_pain" to listOf("પેટના દુખાવા"),
            ),
            "kn" to mapOf(
                "diarrhoea" to listOf("ಅತಿಸಾರ"),
                "vomiting" to listOf("ವಾಂತಿ"),
                "fever" to listOf("ಜ್ವರ"),
                "stomach_pain" to listOf("ಹೊಟ್ಟೆ ನೋವು"),
            ),
            "or" to mapOf(
                "diarrhoea" to listOf("ଝାଡ଼ା"),
                "vomiting" to listOf("ବାନ୍ତି"),
                "fever" to listOf("ଜ୍ୱର"),
                "stomach_pain" to listOf("ପେଟ ଯନ୍ତ୍ରଣା"),
            ),
        )

        val SYMPTOM_TERMS_EN: Map<String, List<String>> = mapOf(
            "diarrhoea" to listOf("diarrhea", "diarrhoea", "loose motion", "stomach upset"),
            "vomiting" to listOf("vomit", "throwing up"),
            "fever" to listOf("fever"),
            "stomach_pain" to listOf("stomach pain", "abdominal pain", "belly ache"),
            "headache" to listOf("headache", "head ache"),
            "weakness" to listOf("weakness", "fatigue", "tired"),
            "jaundice" to listOf("jaundice", "yellow eyes"),
            "dehydration" to listOf("dehydration", "dehydrated"),
        )

        val NUMBER_WORDS: Map<String, Int> = mapOf(
            "one" to 1, "two" to 2, "three" to 3, "four" to 4, "five" to 5,
            "एक" to 1, "दो" to 2, "तीन" to 3, "चार" to 4, "पांच" to 5,
            "এক" to 1, "দুই" to 2, "তিন" to 3, "চার" to 4, "পাঁচ" to 5,
        )
    }
}