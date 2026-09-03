package com.jalrakshak.field.ui.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalrakshak.field.data.repository.ServiceLocator
import com.jalrakshak.field.domain.model.Alert
import com.jalrakshak.field.domain.model.WaterSource
import com.jalrakshak.field.domain.repository.AlertRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class AlertDetailUiState(
    val alert: Alert? = null,
    val waterSources: List<WaterSource> = emptyList(),
    val isLoading: Boolean = true,
    val isActioning: Boolean = false,
    val error: String? = null,
    val actionSuccess: String? = null,
)

class AlertDetailViewModel(
    private val locator: ServiceLocator,
    savedStateHandle: SavedStateHandle = SavedStateHandle(),
) : ViewModel() {

    private var alertId: String = savedStateHandle["alertId"] ?: ""
    private val _uiState = MutableStateFlow(AlertDetailUiState())
    val uiState: StateFlow<AlertDetailUiState> = _uiState
    private val alertRepo: AlertRepository = locator.alertRepository

    init {
        observeAlert()
        if (alertId.isNotBlank()) refreshDetail()
    }

    fun setAlertId(id: String) {
        if (id.isBlank() || id == alertId) return
        alertId = id
        observeAlert()
        refreshDetail()
    }

    private fun observeAlert() {
        viewModelScope.launch {
            if (alertId.isBlank()) return@launch
            alertRepo.observeAlert(alertId).collect { alert ->
                if (alert != null) {
                    _uiState.value = _uiState.value.copy(alert = alert, isLoading = false)
                }
            }
        }
    }

    fun refreshDetail() {
        viewModelScope.launch {
            if (alertId.isBlank()) return@launch
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                alertRepo.refreshAlertDetail(alertId)
                // Also fetch water sources for the alert's location
                val locationId = _uiState.value.alert?.location?.id
                if (locationId != null) {
                    locator.waterRepository.getWaterSources(locationId)
                        .onSuccess { sources: List<WaterSource> ->
                            _uiState.value = _uiState.value.copy(waterSources = sources)
                        }
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = "Could not load alert details")
            } finally {
                _uiState.value = _uiState.value.copy(isLoading = false)
            }
        }
    }

    fun acknowledge() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isActioning = true)
            try {
                alertRepo.acknowledge(alertId)
                _uiState.value = _uiState.value.copy(actionSuccess = "Alert acknowledged")
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = "Could not acknowledge alert")
            } finally {
                _uiState.value = _uiState.value.copy(isActioning = false)
            }
        }
    }

    fun resolve() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isActioning = true)
            try {
                alertRepo.resolve(alertId)
                _uiState.value = _uiState.value.copy(actionSuccess = "Alert resolved")
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = "Could not resolve alert")
            } finally {
                _uiState.value = _uiState.value.copy(isActioning = false)
            }
        }
    }
}