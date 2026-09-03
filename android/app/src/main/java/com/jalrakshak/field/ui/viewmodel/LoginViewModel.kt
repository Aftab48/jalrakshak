package com.jalrakshak.field.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalrakshak.field.domain.model.Worker
import com.jalrakshak.field.domain.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class LoginUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val worker: Worker? = null,
)

class LoginViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState

    fun login(workerId: String, pin: String) {
        viewModelScope.launch {
            _uiState.value = LoginUiState(isLoading = true)
            authRepository.login(workerId, pin)
                .onSuccess { worker ->
                    _uiState.value = LoginUiState(worker = worker)
                }
                .onFailure { e ->
                    _uiState.value = LoginUiState(error = e.message ?: "Login failed")
                }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}