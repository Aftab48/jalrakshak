package com.jalrakshak.field.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalrakshak.field.data.repository.ServiceLocator
import com.jalrakshak.field.domain.model.Verification
import com.jalrakshak.field.domain.model.WaterSource
import com.jalrakshak.field.location.DeviceLocation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.util.UUID

data class VerifyAlertUiState(
    val alertId: String = "",
    val casesPresent: String = "YES",
    val affectedPeople: Int = 1,
    val affectedHouseholds: Int = 1,
    val selectedSymptoms: Set<String> = emptySet(),
    val waterSourceId: String? = null,
    val waterCondition: String = "NORMAL",
    val notes: String = "",
    val deviceLocation: DeviceLocation? = null,
    val locationCaptured: Boolean = false,
    val waterSources: List<WaterSource> = emptyList(),
    val isSaving: Boolean = false,
    val error: String? = null,
    val isSubmitted: Boolean = false,
)

class VerifyAlertViewModel(private val locator: ServiceLocator) : ViewModel() {

    private val _uiState = MutableStateFlow(VerifyAlertUiState())
    val uiState: StateFlow<VerifyAlertUiState> = _uiState
    private val verificationRepo = locator.verificationRepository
    private val waterRepo = locator.waterRepository

    fun setAlertId(id: String) { _uiState.value = _uiState.value.copy(alertId = id) }

    fun setCasesPresent(v: String) { _uiState.value = _uiState.value.copy(casesPresent = v) }
    fun setAffectedPeople(n: Int) { _uiState.value = _uiState.value.copy(affectedPeople = n.coerceIn(0, 100000)) }
    fun setAffectedHouseholds(n: Int) { _uiState.value = _uiState.value.copy(affectedHouseholds = n.coerceIn(0, 10000)) }
    fun toggleSymptom(s: String) {
        val current = _uiState.value.selectedSymptoms.toMutableSet()
        if (s in current) current.remove(s) else current.add(s)
        _uiState.value = _uiState.value.copy(selectedSymptoms = current)
    }
    fun setWaterSource(id: String?) { _uiState.value = _uiState.value.copy(waterSourceId = id) }
    fun setWaterCondition(c: String) { _uiState.value = _uiState.value.copy(waterCondition = c) }
    fun setNotes(n: String) { _uiState.value = _uiState.value.copy(notes = n) }
    fun updateLocation(lat: Double?, lng: Double?) {
        _uiState.value = _uiState.value.copy(
            deviceLocation = DeviceLocation(lat, lng, "gps", null, null),
            locationCaptured = lat != null && lng != null,
        )
    }

    fun loadWaterSources(locationId: String) {
        viewModelScope.launch {
            waterRepo.getWaterSources(locationId)
                .onSuccess { _uiState.value = _uiState.value.copy(waterSources = it) }
        }
    }

    fun submit() {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, error = null)
            try {
                verificationRepo.submit(
                    Verification(
                        id = UUID.randomUUID().toString(),
                        alertId = state.alertId,
                        casesPresent = state.casesPresent,
                        affectedPeople = state.affectedPeople,
                        affectedHouseholds = state.affectedHouseholds,
                        symptoms = state.selectedSymptoms.toList(),
                        waterSourceId = state.waterSourceId,
                        waterCondition = state.waterCondition,
                        notes = state.notes.ifBlank { null },
                        latitude = state.deviceLocation?.latitude,
                        longitude = state.deviceLocation?.longitude,
                    )
                )
                _uiState.value = _uiState.value.copy(isSubmitted = true)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = "Could not save verification")
            } finally {
                _uiState.value = _uiState.value.copy(isSaving = false)
            }
        }
    }
}