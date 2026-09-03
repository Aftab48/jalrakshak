package com.jalrakshak.field.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalrakshak.field.data.repository.ServiceLocator
import com.jalrakshak.field.domain.model.WaterSource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class WaterUiState(
    val waterSources: List<WaterSource> = emptyList(),
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val pendingInspections: Int = 0,
    val error: String? = null,
)

class WaterViewModel(private val locator: ServiceLocator) : ViewModel() {

    private val _uiState = MutableStateFlow(WaterUiState())
    val uiState: StateFlow<WaterUiState> = _uiState
    private val waterRepo = locator.waterRepository
    private val syncManager = locator.syncManager

    init {
        viewModelScope.launch {
            syncManager.pendingInspections.collect { _uiState.value = _uiState.value.copy(pendingInspections = it) }
        }
        refresh()
    }

    fun refresh(locationId: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRefreshing = true, error = null)
            waterRepo.getWaterSources(locationId)
                .onSuccess { sources ->
                    _uiState.value = _uiState.value.copy(waterSources = sources, isLoading = false)
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(error = "Could not load water sources")
                }
            _uiState.value = _uiState.value.copy(isRefreshing = false)
        }
    }
}