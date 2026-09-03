package com.jalrakshak.field.voice

/**
 * Abstraction for multilingual voice-to-structured-report intake.
 *
 * The actual speech recognition engine is pluggable. A real ASR+NLU provider
 * can be swapped in behind this interface without touching the rest of the app.
 * The bundled default is clearly marked as a DEMO/simulation — it never claims
 * to be real AI or real speech recognition.
 */
interface VoiceRecognitionService {
    val name: String
    val isDemo: Boolean
    suspend fun transcribeAndParse(utterance: String): VoiceParseResult
}

data class VoiceParseResult(
    val language: String,
    val text: String,
    val symptoms: List<String>,
    val durationDays: Int?,
    val severity: Int,
    val isSimulated: Boolean,
)

data class VoiceLanguage(
    val code: String,
    val name: String,
)

object VoiceLanguages {
    val supported = listOf(
        VoiceLanguage("hi", "Hindi"),
        VoiceLanguage("bn", "Bengali"),
        VoiceLanguage("mr", "Marathi"),
        VoiceLanguage("te", "Telugu"),
        VoiceLanguage("ta", "Tamil"),
        VoiceLanguage("gu", "Gujarati"),
        VoiceLanguage("kn", "Kannada"),
        VoiceLanguage("or", "Odia"),
    )
}