package com.jalrakshak.field.ui.screens.alerts

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.jalrakshak.field.ui.components.*
import com.jalrakshak.field.ui.screens.home.AlertCard
import com.jalrakshak.field.ui.viewmodel.AlertsViewModel
import com.jalrakshak.field.ui.viewmodel.JalRakshakViewModelFactory

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AlertsScreen(
    onNavigateToAlert: (String) -> Unit,
    onNavigateToVerify: (String) -> Unit,
    viewModel: AlertsViewModel = viewModel(factory = JalRakshakViewModelFactory(LocalContext.current)),
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Alerts") }) },
    ) { padding ->
        PullToRefreshBox(isRefreshing = state.isRefreshing, onRefresh = { viewModel.refresh() }, modifier = Modifier.padding(padding)) {
            if (state.alerts.isEmpty() && !state.isLoading) {
                EmptyState(title = "No active alerts", subtitle = "All clear for now", modifier = Modifier.fillMaxSize())
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxSize()) {
                    items(state.alerts, key = { it.id }) { alert ->
                        AlertCard(alert = alert, onClick = { onNavigateToAlert(alert.id) })
                    }
                }
            }
        }
    }
}