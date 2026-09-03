package com.jalrakshak.field.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.jalrakshak.field.JalRakshakApplication
import com.jalrakshak.field.data.repository.ServiceLocator
import com.jalrakshak.field.data.repository.SettingsRepository
import com.jalrakshak.field.domain.repository.AlertRepository
import com.jalrakshak.field.domain.repository.AuthRepository

class JalRakshakViewModelFactory(private val context: android.content.Context) : ViewModelProvider.Factory {
    private val app = context.applicationContext as JalRakshakApplication
    private val locator = ServiceLocator(context, app.database, app.apiClient)

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return when {
            modelClass.isAssignableFrom(LoginViewModel::class.java) ->
                LoginViewModel(locator.authRepository) as T
            modelClass.isAssignableFrom(HomeViewModel::class.java) ->
                HomeViewModel(locator) as T
            modelClass.isAssignableFrom(AlertsViewModel::class.java) ->
                AlertsViewModel(locator) as T
            modelClass.isAssignableFrom(AlertDetailViewModel::class.java) ->
                AlertDetailViewModel(locator) as T
            modelClass.isAssignableFrom(ReportsViewModel::class.java) ->
                ReportsViewModel(locator) as T
            modelClass.isAssignableFrom(SubmitReportViewModel::class.java) ->
                SubmitReportViewModel(locator) as T
            modelClass.isAssignableFrom(WaterViewModel::class.java) ->
                WaterViewModel(locator) as T
            modelClass.isAssignableFrom(WaterInspectionViewModel::class.java) ->
                WaterInspectionViewModel(locator) as T
            modelClass.isAssignableFrom(ProfileViewModel::class.java) ->
                ProfileViewModel(locator.authRepository, locator.settingsRepository) as T
            modelClass.isAssignableFrom(SettingsViewModel::class.java) ->
                SettingsViewModel(locator.settingsRepository) as T
            modelClass.isAssignableFrom(SyncStatusViewModel::class.java) ->
                SyncStatusViewModel(locator.syncManager) as T
            modelClass.isAssignableFrom(VoiceReportViewModel::class.java) ->
                VoiceReportViewModel(locator) as T
            modelClass.isAssignableFrom(VerifyAlertViewModel::class.java) ->
                VerifyAlertViewModel(locator) as T
            else -> throw IllegalArgumentException("Unknown ViewModel: $modelClass")
        }
    }
}