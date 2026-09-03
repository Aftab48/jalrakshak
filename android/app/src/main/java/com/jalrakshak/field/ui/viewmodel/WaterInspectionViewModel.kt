package com.jalrakshak.field.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalrakshak.field.data.repository.ServiceLocator
import com.jalrakshak.field.domain.model.WaterInspection
import com.jalrakshak.field.location.DeviceLocation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

data class WaterInspectionUiState(
    val waterSourceId: String = "",
    val waterSourceName: String = "",
    val turbidity: String = "",
    val ph: String = "",
    val tds: String = "",
    val freeChlorine: String = "",
    val ecoliDetected: Boolean? = null,
    val visualCondition: String = "NORMAL",
    val notes: String = "",
    val deviceLocation: DeviceLocation? = null,
    val locationCaptured: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null,
    val isSubmitted: Boolean = false,
)

class WaterInspectionViewModel(private val locator: ServiceLocator) : ViewModel() {

    private val _uiState = MutableStateFlow(WaterInspectionUiState())
    val uiState: StateFlow<WaterInspectionUiState> = _uiState
    private val waterRepo = locator.waterRepository

    fun setSource(id: String, name: String) {
        _uiState.value = _uiState.value.copy(waterSourceId = id, waterSourceName = name)
    }

    fun updateTurbidity(v: String) { _uiState.value = _uiState.value.copy(turbidity = v) }
    fun updatePh(v: String) { _uiState.value = _uiState.value.copy(ph = v) }
    fun updateTds(v: String) { _uiState.value = _uiState.value.copy(tds = v) }
    fun updateFreeChlorine(v: String) { _uiState.value = _uiState.value.copy(freeChlorine = v) }
    fun updateEcoli(detected: Boolean?) { _uiState.value = _uiState.value.copy(ecoliDetected = detected) }
    fun updateVisualCondition(c: String) { _uiState.value = _uiState.value.copy(visualCondition = c) }
    fun updateNotes(n: String) { _uiState.value = _uiState.value.copy(notes = n) }
    fun updateLocation(lat: Double?, lng: Double?) {
        _uiState.value = _uiState.value.copy(
            deviceLocation = DeviceLocation(lat, lng, "gps", null, null),
            locationCaptured = lat != null && lng != null,
        )
    }

    fun submit() {
        val state = _uiState.value
        if (state.waterSourceId.isBlank()) {
            _uiState.value = state.copy(error = "Select a water source first")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, error = null)
            val inspection = WaterInspection(
                id = java.util.UUID.randomUUID().toString(),
                waterSourceId = state.waterSourceId,
                waterSourceName = state.waterSourceName,
                observedAt = Instant.now().atZone(ZoneId.of("Asia/Kolkata"))
                    .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
                turbidityNTU = state.turbidity.toDoubleOrNull(),
                ph = state.ph.toDoubleOrNull(),
                tds = state.tds.toDoubleOrNull(),
                freeChlorine = state.freeChlorine.toDoubleOrNull(),
                ecoliDetected = state.ecoliDetected,
                visualCondition = state.visualCondition,
                notes = state.notes.ifBlank { null },
                latitude = state.deviceLocation?.latitude,
                longitude = state.deviceLocation?.longitude,
            )
            try {
                waterRepo.submitInspection(inspection)
                _uiState.value = _uiState.value.copy(isSubmitted = true)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = "Could not save inspection: ${e.message}")
            } finally {
                _uiState.value = _uiState.value.copy(isSaving = false)
            }
        }
    }
}