package com.jalrakshak.field.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.ListAlt
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material.icons.outlined.ListAlt
import androidx.compose.material.icons.outlined.WaterDrop
import androidx.compose.material.icons.outlined.Person
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val title: String, val icon: ImageVector, val selectedIcon: ImageVector) {
    data object Home : Screen("home", "Home", Icons.Outlined.Home, Icons.Filled.Home)
    data object Alerts : Screen("alerts", "Alerts", Icons.Outlined.Warning, Icons.Filled.Warning)
    data object Reports : Screen("reports", "Reports", Icons.Outlined.ListAlt, Icons.Filled.ListAlt)
    data object Water : Screen("water", "Water", Icons.Outlined.WaterDrop, Icons.Filled.WaterDrop)
    data object Profile : Screen("profile", "Profile", Icons.Outlined.Person, Icons.Filled.Person)
}

sealed class SecondaryScreen(val route: String) {
    data object Login : SecondaryScreen("login")
    data object AlertDetail : SecondaryScreen("alert/{alertId}") {
        fun createRoute(alertId: String) = "alert/$alertId"
    }
    data object SubmitReport : SecondaryScreen("submit_report")
    data object VoiceReport : SecondaryScreen("voice_report")
    data object WaterInspection : SecondaryScreen("water_inspection/{waterSourceId}/{waterSourceName}") {
        fun createRoute(sourceId: String, sourceName: String) = "water_inspection/$sourceId/${java.net.URLEncoder.encode(sourceName, "UTF-8")}"
    }
    data object VerifyAlert : SecondaryScreen("verify_alert/{alertId}") {
        fun createRoute(alertId: String) = "verify_alert/$alertId"
    }
    data object SyncStatus : SecondaryScreen("sync_status")
    data object Settings : SecondaryScreen("settings")
    data object Locations : SecondaryScreen("locations")
    data object VoiceReportConfirm : SecondaryScreen("voice_report_confirm")
}

val bottomNavItems = listOf(Screen.Home, Screen.Alerts, Screen.Reports, Screen.Water, Screen.Profile)