package com.jalrakshak.field.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore by preferencesDataStore(name = "settings")

enum class ThemeMode { SYSTEM, LIGHT, DARK }

object SettingsKeys {
    val THEME_MODE = stringPreferencesKey("theme_mode")
    val LANGUAGE = stringPreferencesKey("language")
    val WORKER_NAME = stringPreferencesKey("worker_name")
    val WORKER_ROLE = stringPreferencesKey("worker_role")
    val WORKER_ID = stringPreferencesKey("worker_id")
    val WORKER_TOKEN = stringPreferencesKey("worker_token")
    val ASSIGNED_AREA = stringPreferencesKey("assigned_area")
    val ASSIGNED_LOCATION_ID = stringPreferencesKey("assigned_location_id")
    val LAST_SYNC = stringPreferencesKey("last_sync")
}

class SettingsRepository(private val context: Context) {

    val themeMode: Flow<ThemeMode> = context.dataStore.data.map { prefs ->
        when (prefs[SettingsKeys.THEME_MODE]) {
            "light" -> ThemeMode.LIGHT
            "dark" -> ThemeMode.DARK
            else -> ThemeMode.SYSTEM
        }
    }

    val language: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[SettingsKeys.LANGUAGE] ?: "en"
    }

    val workerName: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[SettingsKeys.WORKER_NAME] ?: ""
    }

    val workerRole: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[SettingsKeys.WORKER_ROLE] ?: ""
    }

    val workerId: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[SettingsKeys.WORKER_ID] ?: ""
    }

    val token: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[SettingsKeys.WORKER_TOKEN] ?: ""
    }

    val assignedArea: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[SettingsKeys.ASSIGNED_AREA] ?: ""
    }

    val assignedLocationId: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[SettingsKeys.ASSIGNED_LOCATION_ID] ?: ""
    }

    val lastSync: Flow<Long> = context.dataStore.data.map { prefs ->
        prefs[SettingsKeys.LAST_SYNC]?.toLongOrNull() ?: 0L
    }

    val isLoggedIn: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[SettingsKeys.WORKER_TOKEN]?.isNotEmpty() == true
    }

    suspend fun setThemeMode(mode: ThemeMode) {
        context.dataStore.edit { prefs ->
            prefs[SettingsKeys.THEME_MODE] = when (mode) {
                ThemeMode.LIGHT -> "light"
                ThemeMode.DARK -> "dark"
                ThemeMode.SYSTEM -> "system"
            }
        }
    }

    suspend fun setLanguage(lang: String) {
        context.dataStore.edit { prefs ->
            prefs[SettingsKeys.LANGUAGE] = lang
        }
    }

    suspend fun saveWorker(
        id: String,
        name: String,
        role: String,
        token: String,
        assignedArea: String,
        assignedLocationId: String,
    ) {
        context.dataStore.edit { prefs ->
            prefs[SettingsKeys.WORKER_ID] = id
            prefs[SettingsKeys.WORKER_NAME] = name
            prefs[SettingsKeys.WORKER_ROLE] = role
            prefs[SettingsKeys.WORKER_TOKEN] = token
            prefs[SettingsKeys.ASSIGNED_AREA] = assignedArea
            prefs[SettingsKeys.ASSIGNED_LOCATION_ID] = assignedLocationId
        }
    }

    suspend fun clearWorker() {
        context.dataStore.edit { prefs ->
            prefs.remove(SettingsKeys.WORKER_ID)
            prefs.remove(SettingsKeys.WORKER_NAME)
            prefs.remove(SettingsKeys.WORKER_ROLE)
            prefs.remove(SettingsKeys.WORKER_TOKEN)
            prefs.remove(SettingsKeys.ASSIGNED_AREA)
            prefs.remove(SettingsKeys.ASSIGNED_LOCATION_ID)
        }
    }

    suspend fun setLastSync(timestamp: Long) {
        context.dataStore.edit { prefs ->
            prefs[SettingsKeys.LAST_SYNC] = timestamp.toString()
        }
    }
}