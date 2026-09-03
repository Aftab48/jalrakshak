package com.jalrakshak.field.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalrakshak.field.data.repository.ServiceLocator
import com.jalrakshak.field.domain.model.HealthReport
import com.jalrakshak.field.voice.MockVoiceRecognitionService
import com.jalrakshak.field.voice.VoiceParseResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

data class VoiceReportUiState(
    val recognizedText: String = "",
    val parseResult: VoiceParseResult? = null,
    val selectedLanguage: String = "auto",
    val isRecognizing: Boolean = false,
    val isSimulated: Boolean = false,
    val error: String? = null,
    val isSubmitted: Boolean = false,
)

class VoiceReportViewModel(private val locator: ServiceLocator) : ViewModel() {

    private val _uiState = MutableStateFlow(VoiceReportUiState())
    val uiState: StateFlow<VoiceReportUiState> = _uiState

    private val voiceService = MockVoiceRecognitionService()
    private val reportRepo = locator.reportRepository

    fun updateText(text: String) { _uiState.value = _uiState.value.copy(recognizedText = text) }

    fun parse() {
        val text = _uiState.value.recognizedText
        if (text.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "Enter or paste voice transcription text")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRecognizing = true, error = null)
            try {
                val result = voiceService.transcribeAndParse(text)
                _uiState.value = _uiState.value.copy(
                    parseResult = result,
                    isRecognizing = false,
                    isSimulated = true,
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = "Could not parse voice report", isRecognizing = false)
            }
        }
    }

    fun submit() {
        val result = _uiState.value.parseResult
        if (result == null || result.symptoms.isEmpty()) {
            _uiState.value = _uiState.value.copy(error = "No symptoms detected from voice input")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRecognizing = true)
            val locationId = try {
                (locator.authRepository as com.jalrakshak.field.data.repository.AuthRepositoryImpl)
                    .let { "" } // fallback
            } catch (_: Exception) { "" }

            val report = HealthReport(
                id = java.util.UUID.randomUUID().toString(),
                locationId = locationId.ifBlank { "cm4axxxxxxxxxxxxxxxxxxxxxxxx" },
                source = "HEALTH_WORKER",
                symptoms = result.symptoms,
                severity = result.severity,
                onsetAt = Instant.now().minusMillis((result.durationDays?.toLong() ?: 1) * 86_400_000)
                    .atZone(ZoneId.of("Asia/Kolkata"))
                    .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
                notes = "Voice intake (${result.language}): ${result.text.take(200)}",
            )
            try {
                reportRepo.submit(report)
                _uiState.value = _uiState.value.copy(isSubmitted = true)
            } catch (_: Exception) {
                reportRepo.submitOffline(report)
                _uiState.value = _uiState.value.copy(isSubmitted = true)
            } finally {
                _uiState.value = _uiState.value.copy(isRecognizing = false)
            }
        }
    }
}