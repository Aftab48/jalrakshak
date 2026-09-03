package com.jalrakshak.field.ui.screens.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.jalrakshak.field.domain.model.Alert
import com.jalrakshak.field.ui.components.*
import com.jalrakshak.field.ui.theme.*
import com.jalrakshak.field.ui.viewmodel.HomeViewModel
import com.jalrakshak.field.ui.viewmodel.JalRakshakViewModelFactory

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToAlert: (String) -> Unit,
    onNavigateToSync: () -> Unit,
    onNavigateToLocations: () -> Unit,
    viewModel: HomeViewModel = viewModel(factory = JalRakshakViewModelFactory(LocalContext.current)),
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("JalRakshak") },
                actions = {
                    IconButton(onClick = onNavigateToSync) { Icon(Icons.Filled.Sync, "Sync") }
                },
            )
        },
    ) { padding ->
        PullToRefreshBox(isRefreshing = state.isRefreshing, onRefresh = { viewModel.refreshData() }, modifier = Modifier.padding(padding)) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                    ) {
                        Column(Modifier.padding(20.dp)) {
                            Text("Good morning, ${state.workerName.ifBlank { "Worker" }}", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)
                            Text("${state.assignedArea.ifBlank { "Assigned area" }}  ·  ${state.workerRole.ifBlank { "Field Worker" }}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f))
                        }
                    }
                }

                state.primaryLocation?.let { location ->
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(16.dp)) {
                                Text("Local Risk", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.height(8.dp))
                                location.risk?.let { risk ->
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        Column {
                                            Text("Risk", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text("${risk.score}/100", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = when {
                                                risk.score >= 75 -> RiskRed; risk.score >= 55 -> RiskOrange; risk.score >= 32 -> RiskYellow; else -> RiskGreen
                                            })
                                        }
                                        Column {
                                            Text("Confidence", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text("${risk.confidence}%", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                                        }
                                        Column(Modifier.weight(1f), horizontalAlignment = Alignment.End) {
                                            WarningLevelBadge(risk.warningLevel)
                                        }
                                    }
                                    if (risk.dominantSyndrome != null && risk.dominantSyndrome != "none") {
                                        Spacer(Modifier.height(8.dp))
                                        Text("Dominant: ${risk.dominantSyndrome}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                } ?: Text("No risk data available", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }

                item {
                    Text("Today's Tasks", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 4.dp))
                }

                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Card(Modifier.weight(1f)) {
                            Column(Modifier.padding(14.dp)) {
                                Text("Urgent Verifications", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("${state.pendingTaskCount}", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = if (state.pendingTaskCount > 0) PriorityP1 else MaterialTheme.colorScheme.onSurface)
                            }
                        }
                        Card(Modifier.weight(1f)) {
                            Column(Modifier.padding(14.dp)) {
                                Text("Pending Reports", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("${state.pendingReports}", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                if (state.activeAlerts.isNotEmpty()) {
                    item {
                        Text("Active Alerts", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 4.dp))
                    }
                    items(state.activeAlerts.take(5), key = { it.id }) { alert ->
                        AlertCard(alert = alert, onClick = { onNavigateToAlert(alert.id) })
                    }
                }

                if (state.error != null) {
                    item {
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                            Text(state.error ?: "", Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onErrorContainer, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AlertCard(alert: Alert, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                PriorityBadge(alert.priority)
                WarningLevelBadge(alert.warningLevel)
                RiskLevelBadge(alert.level, Modifier.weight(1f))
            }
            Text(alert.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Medium)
            Text(alert.message.take(120) + if (alert.message.length > 120) "…" else "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Risk: ${alert.score}/100", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                Text("Confidence: ${alert.confidence}%", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}