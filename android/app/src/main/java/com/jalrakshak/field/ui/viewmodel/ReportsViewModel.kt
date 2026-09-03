package com.jalrakshak.field.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalrakshak.field.data.repository.ServiceLocator
import com.jalrakshak.field.domain.model.HealthReport
import com.jalrakshak.field.domain.repository.ReportRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class ReportsUiState(
    val reports: List<HealthReport> = emptyList(),
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val pendingCount: Int = 0,
    val error: String? = null,
)

class ReportsViewModel(private val locator: ServiceLocator) : ViewModel() {

    private val _uiState = MutableStateFlow(ReportsUiState())
    val uiState: StateFlow<ReportsUiState> = _uiState
    private val reportRepo: ReportRepository = locator.reportRepository

    init {
        viewModelScope.launch {
            reportRepo.observeReports().collect { reports ->
                _uiState.value = _uiState.value.copy(reports = reports, isLoading = false)
            }
        }
        viewModelScope.launch {
            reportRepo.observePendingCount().collect { count ->
                _uiState.value = _uiState.value.copy(pendingCount = count)
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRefreshing = true)
            _uiState.value = _uiState.value.copy(isRefreshing = false)
        }
    }
}