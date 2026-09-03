package com.jalrakshak.field.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalrakshak.field.data.repository.ServiceLocator
import com.jalrakshak.field.domain.model.Alert
import com.jalrakshak.field.domain.repository.AlertRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class AlertsUiState(
    val alerts: List<Alert> = emptyList(),
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val error: String? = null,
)

class AlertsViewModel(private val locator: ServiceLocator) : ViewModel() {

    private val _uiState = MutableStateFlow(AlertsUiState())
    val uiState: StateFlow<AlertsUiState> = _uiState
    private val alertRepo: AlertRepository = locator.alertRepository

    init {
        viewModelScope.launch {
            alertRepo.observeActiveAlerts().collect { alerts ->
                _uiState.value = _uiState.value.copy(alerts = alerts, isLoading = false)
            }
        }
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRefreshing = true, error = null)
            try {
                alertRepo.refreshAlerts()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = "Could not load alerts")
            } finally {
                _uiState.value = _uiState.value.copy(isRefreshing = false)
            }
        }
    }
}