package com.jalrakshak.field.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.jalrakshak.field.ui.navigation.Screen
import com.jalrakshak.field.ui.navigation.SecondaryScreen
import com.jalrakshak.field.ui.navigation.bottomNavItems
import com.jalrakshak.field.ui.screens.alerts.AlertDetailScreen
import com.jalrakshak.field.ui.screens.alerts.AlertsScreen
import com.jalrakshak.field.ui.screens.alerts.VerifyAlertScreen
import com.jalrakshak.field.ui.screens.auth.LoginScreen
import com.jalrakshak.field.ui.screens.home.HomeScreen
import com.jalrakshak.field.ui.screens.home.LocationsScreen
import com.jalrakshak.field.ui.screens.profile.ProfileScreen
import com.jalrakshak.field.ui.screens.profile.SettingsScreen
import com.jalrakshak.field.ui.screens.profile.SyncStatusScreen
import com.jalrakshak.field.ui.screens.reports.ReportsScreen
import com.jalrakshak.field.ui.screens.reports.SubmitReportScreen
import com.jalrakshak.field.ui.screens.reports.VoiceReportScreen
import com.jalrakshak.field.ui.screens.water.WaterInspectionScreen
import com.jalrakshak.field.ui.screens.water.WaterScreen
import com.jalrakshak.field.ui.viewmodel.JalRakshakViewModelFactory
import com.jalrakshak.field.ui.viewmodel.SettingsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JalRakshakApp(initialRoute: String = "home") {
    val navController = rememberNavController()
    val settingsViewModel: SettingsViewModel = viewModel(factory = JalRakshakViewModelFactory(navController.context))
    val themeMode by settingsViewModel.themeMode.collectAsState()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val showBottomBar = bottomNavItems.any { it.route == currentRoute }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    bottomNavItems.forEach { screen ->
                        val selected = currentRoute == screen.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                if (currentRoute != screen.route) {
                                    navController.navigate(screen.route) {
                                        popUpTo(Screen.Home.route) { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            },
                            icon = { Icon(if (selected) screen.selectedIcon else screen.icon, contentDescription = screen.title) },
                            label = { Text(screen.title) },
                        )
                    }
                }
            }
        },
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = initialRoute,
            modifier = Modifier.padding(paddingValues),
            enterTransition = { fadeIn(animationSpec = tween(200)) },
            exitTransition = { fadeOut(animationSpec = tween(200)) },
        ) {
            composable(Screen.Home.route) {
                HomeScreen(
                    onNavigateToAlert = { navController.navigate(SecondaryScreen.AlertDetail.createRoute(it)) },
                    onNavigateToSync = { navController.navigate(SecondaryScreen.SyncStatus.route) },
                    onNavigateToLocations = { navController.navigate(SecondaryScreen.Locations.route) },
                )
            }
            composable(Screen.Alerts.route) {
                AlertsScreen(
                    onNavigateToAlert = { navController.navigate(SecondaryScreen.AlertDetail.createRoute(it)) },
                    onNavigateToVerify = { navController.navigate(SecondaryScreen.VerifyAlert.createRoute(it)) },
                )
            }
            composable(Screen.Reports.route) {
                ReportsScreen(
                    onNavigateToSubmitReport = { navController.navigate(SecondaryScreen.SubmitReport.route) },
                    onNavigateToVoiceReport = { navController.navigate(SecondaryScreen.VoiceReport.route) },
                )
            }
            composable(Screen.Water.route) {
                WaterScreen(
                    onNavigateToInspection = { id, name -> navController.navigate(SecondaryScreen.WaterInspection.createRoute(id, name)) },
                )
            }
            composable(Screen.Profile.route) {
                ProfileScreen(
                    onNavigateToSettings = { navController.navigate(SecondaryScreen.Settings.route) },
                    onNavigateToSync = { navController.navigate(SecondaryScreen.SyncStatus.route) },
                    onNavigateToLogin = { navController.navigate(SecondaryScreen.Login.route) { popUpTo(Screen.Home.route) { inclusive = true } } },
                )
            }
            composable(SecondaryScreen.Login.route) {
                LoginScreen(onLoginSuccess = { navController.navigate(Screen.Home.route) { popUpTo(Screen.Home.route) { inclusive = true } } })
            }
            composable(SecondaryScreen.AlertDetail.route, arguments = listOf(navArgument("alertId") { type = NavType.StringType })) { back ->
                val alertId = back.arguments?.getString("alertId") ?: ""
                AlertDetailScreen(alertId = alertId, onNavigateBack = { navController.popBackStack() }, onNavigateToVerify = { navController.navigate(SecondaryScreen.VerifyAlert.createRoute(it)) })
            }
            composable(SecondaryScreen.SubmitReport.route) {
                SubmitReportScreen(onNavigateBack = { navController.popBackStack() }, onNavigateToLocations = { navController.navigate(SecondaryScreen.Locations.route) })
            }
            composable(SecondaryScreen.VoiceReport.route) {
                VoiceReportScreen(onNavigateBack = { navController.popBackStack() })
            }
            composable(SecondaryScreen.WaterInspection.route, arguments = listOf(
                navArgument("waterSourceId") { type = NavType.StringType },
                navArgument("waterSourceName") { type = NavType.StringType },
            )) { back ->
                val sourceId = back.arguments?.getString("waterSourceId") ?: ""
                val sourceName = java.net.URLDecoder.decode(back.arguments?.getString("waterSourceName") ?: "", "UTF-8")
                WaterInspectionScreen(sourceId = sourceId, sourceName = sourceName, onNavigateBack = { navController.popBackStack() })
            }
            composable(SecondaryScreen.VerifyAlert.route, arguments = listOf(navArgument("alertId") { type = NavType.StringType })) { back ->
                VerifyAlertScreen(alertId = back.arguments?.getString("alertId") ?: "", onNavigateBack = { navController.popBackStack() })
            }
            composable(SecondaryScreen.SyncStatus.route) {
                SyncStatusScreen(onNavigateBack = { navController.popBackStack() })
            }
            composable(SecondaryScreen.Settings.route) {
                SettingsScreen(onNavigateBack = { navController.popBackStack() })
            }
            composable(SecondaryScreen.Locations.route) {
                LocationsScreen(onNavigateBack = { navController.popBackStack() })
            }
        }
    }
}