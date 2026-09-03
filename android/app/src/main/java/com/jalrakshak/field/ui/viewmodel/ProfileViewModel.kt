package com.jalrakshak.field.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalrakshak.field.data.repository.SettingsRepository
import com.jalrakshak.field.domain.repository.AuthRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class ProfileViewModel(
    private val authRepo: AuthRepository,
    private val settings: SettingsRepository,
) : ViewModel() {

    val workerName: StateFlow<String> = settings.workerName
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "")

    val workerRole: StateFlow<String> = settings.workerRole
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "")

    val assignedArea: StateFlow<String> = settings.assignedArea
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "")

    val workerId: StateFlow<String> = settings.workerId
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "")

    fun logout() {
        viewModelScope.launch { authRepo.logout() }
    }
}