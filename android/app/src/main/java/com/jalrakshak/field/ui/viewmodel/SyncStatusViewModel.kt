package com.jalrakshak.field.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalrakshak.field.data.repository.SettingsRepository
import com.jalrakshak.field.data.sync.SyncManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class SyncStatusUiState(
    val pendingReports: Int = 0,
    val pendingInspections: Int = 0,
    val pendingSync: Int = 0,
    val failedSync: Int = 0,
    val isSyncing: Boolean = false,
    val isOnline: Boolean = true,
    val lastSyncedAt: Long? = null,
)

class SyncStatusViewModel(
    private val syncManager: SyncManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SyncStatusUiState())
    val uiState: StateFlow<SyncStatusUiState> = _uiState

    init {
        viewModelScope.launch { syncManager.initialize() }
        viewModelScope.launch {
            syncManager.pendingReports.collect { _uiState.value = _uiState.value.copy(pendingReports = it) }
        }
        viewModelScope.launch {
            syncManager.pendingInspections.collect { _uiState.value = _uiState.value.copy(pendingInspections = it) }
        }
        viewModelScope.launch {
            syncManager.pendingSync.collect { _uiState.value = _uiState.value.copy(pendingSync = it) }
        }
        viewModelScope.launch {
            syncManager.failedSync.collect { _uiState.value = _uiState.value.copy(failedSync = it) }
        }
        viewModelScope.launch {
            syncManager.syncing.collect { _uiState.value = _uiState.value.copy(isSyncing = it) }
        }
        viewModelScope.launch {
            syncManager.lastSyncedAt.collect { _uiState.value = _uiState.value.copy(lastSyncedAt = it) }
        }
        viewModelScope.launch {
            syncManager.observeNetwork().collect { _uiState.value = _uiState.value.copy(isOnline = it) }
        }
    }

    fun syncNow() {
        viewModelScope.launch { syncManager.syncNow() }
    }
}