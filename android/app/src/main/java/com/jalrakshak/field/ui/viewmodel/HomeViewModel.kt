package com.jalrakshak.field.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalrakshak.field.data.repository.ServiceLocator
import com.jalrakshak.field.data.repository.toDomain
import com.jalrakshak.field.domain.model.Alert
import com.jalrakshak.field.domain.model.Location
import com.jalrakshak.field.domain.repository.AlertRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

data class HomeUiState(
    val workerName: String = "",
    val workerRole: String = "",
    val assignedArea: String = "",
    val primaryLocation: Location? = null,
    val activeAlerts: List<Alert> = emptyList(),
    val pendingTaskCount: Int = 0,
    val pendingReports: Int = 0,
    val pendingInspections: Int = 0,
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val error: String? = null,
)

class HomeViewModel(
    private val locator: ServiceLocator,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState

    private val authRepo = locator.authRepository
    private val alertRepo: AlertRepository = locator.alertRepository
    private val syncManager = locator.syncManager

    init {
        viewModelScope.launch {
            authRepo.workerName.collect { _uiState.value = _uiState.value.copy(workerName = it) }
        }
        viewModelScope.launch {
            authRepo.workerRole.collect { _uiState.value = _uiState.value.copy(workerRole = it) }
        }
        viewModelScope.launch {
            authRepo.assignedArea.collect { _uiState.value = _uiState.value.copy(assignedArea = it) }
        }
        viewModelScope.launch {
            syncManager.pendingReports.collect { _uiState.value = _uiState.value.copy(pendingReports = it) }
        }
        viewModelScope.launch {
            syncManager.pendingInspections.collect { _uiState.value = _uiState.value.copy(pendingInspections = it) }
        }
        viewModelScope.launch {
            alertRepo.observeActiveCount().collect { _uiState.value = _uiState.value.copy(pendingTaskCount = it) }
        }
        viewModelScope.launch {
            alertRepo.observeActiveAlerts().collect { _uiState.value = _uiState.value.copy(activeAlerts = it) }
        }

        refreshData()
    }

    fun refreshData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRefreshing = true, error = null)
            try {
                alertRepo.refreshAlerts()
                val locationId = authRepo.assignedLocationId.first()
                if (locationId.isNotBlank()) {
                    val resp = locator.apiClient.api.getLocations()
                    if (resp.ok) {
                        val matched = resp.locations.find { it.id == locationId }
                        if (matched != null) {
                            _uiState.value = _uiState.value.copy(primaryLocation = matched.toDomain())
                        }
                    }
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = "Could not refresh. Data may be outdated.")
            } finally {
                _uiState.value = _uiState.value.copy(isLoading = false, isRefreshing = false)
            }
        }
    }
}