package com.jalrakshak.field.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalrakshak.field.data.repository.ServiceLocator
import com.jalrakshak.field.data.repository.ReportRepositoryImpl
import com.jalrakshak.field.domain.model.HealthReport
import com.jalrakshak.field.domain.model.SymptomVocabulary
import com.jalrakshak.field.domain.repository.ReportRepository
import com.jalrakshak.field.location.DeviceLocation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

data class SubmitReportUiState(
    val locationId: String = "",
    val locationName: String = "",
    val selectedSymptoms: Set<String> = emptySet(),
    val ageBand: String? = null,
    val severity: Int = 2,
    val durationDays: Int = 1,
    val affectedPeople: Int = 1,
    val waterSourceId: String? = null,
    val notes: String = "",
    val deviceLocation: DeviceLocation? = null,
    val locationCaptured: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null,
    val isSubmitted: Boolean = false,
    val reportId: String? = null,
)

class SubmitReportViewModel(private val locator: ServiceLocator) : ViewModel() {

    private val _uiState = MutableStateFlow(SubmitReportUiState())
    val uiState: StateFlow<SubmitReportUiState> = _uiState

    private val reportRepo: ReportRepository = locator.reportRepository

    init {
        viewModelScope.launch {
            var locationId = locator.authRepository.assignedLocationId.first()
            var areaName = locator.authRepository.assignedArea.first()
            if (locationId.isBlank()) {
                try {
                    val resp = locator.apiClient.api.getLocations()
                    val first = resp.locations.firstOrNull()
                    if (first != null) {
                        locationId = first.id
                        areaName = first.name
                    }
                } catch (_: Exception) {}
            }
            _uiState.value = _uiState.value.copy(locationId = locationId, locationName = areaName)
        }
    }

    fun updateSymptom(symptom: String, selected: Boolean) {
        val current = _uiState.value.selectedSymptoms.toMutableSet()
        if (selected) current.add(symptom) else current.remove(symptom)
        _uiState.value = _uiState.value.copy(selectedSymptoms = current)
    }

    fun updateAgeBand(ageBand: String) { _uiState.value = _uiState.value.copy(ageBand = ageBand) }
    fun updateSeverity(severity: Int) { _uiState.value = _uiState.value.copy(severity = severity.coerceIn(1, 5)) }
    fun updateDuration(days: Int) { _uiState.value = _uiState.value.copy(durationDays = days.coerceIn(1, 30)) }
    fun updateAffectedPeople(count: Int) { _uiState.value = _uiState.value.copy(affectedPeople = count.coerceIn(1, 10000)) }
    fun updateWaterSource(id: String?) { _uiState.value = _uiState.value.copy(waterSourceId = id) }
    fun updateNotes(notes: String) { _uiState.value = _uiState.value.copy(notes = notes) }
    fun updateLocation(lat: Double?, lng: Double?) {
        _uiState.value = _uiState.value.copy(
            deviceLocation = DeviceLocation(lat, lng, "gps", null, null),
            locationCaptured = lat != null && lng != null,
        )
    }
    fun updateLocationId(id: String) { _uiState.value = _uiState.value.copy(locationId = id) }

    fun submit() {
        val state = _uiState.value
        if (state.selectedSymptoms.isEmpty()) {
            _uiState.value = state.copy(error = "Select at least one symptom")
            return
        }
        if (state.locationId.isBlank()) {
            _uiState.value = state.copy(error = "No assigned location set. Contact your supervisor.")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, error = null)
            val onset = Instant.now().minusMillis(state.durationDays.toLong() * 86_400_000)
            val report = HealthReport(
                id = java.util.UUID.randomUUID().toString(),
                locationId = state.locationId,
                waterSourceId = state.waterSourceId,
                source = "HEALTH_WORKER",
                ageBand = state.ageBand,
                symptoms = state.selectedSymptoms.toList(),
                severity = state.severity,
                onsetAt = onset.atZone(ZoneId.of("Asia/Kolkata")).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
                latitude = state.deviceLocation?.latitude,
                longitude = state.deviceLocation?.longitude,
                notes = state.notes.ifBlank { null },
                affectedPeople = state.affectedPeople,
            )
            try {
                val id = reportRepo.submit(report)
                _uiState.value = _uiState.value.copy(
                    isSubmitted = true,
                    reportId = id,
                )
            } catch (e: Exception) {
                // Save offline
                reportRepo.submitOffline(report)
                _uiState.value = _uiState.value.copy(
                    isSubmitted = true,
                    reportId = report.id,
                )
            } finally {
                _uiState.value = _uiState.value.copy(isSaving = false)
            }
        }
    }

    fun clearError() { _uiState.value = _uiState.value.copy(error = null) }
}