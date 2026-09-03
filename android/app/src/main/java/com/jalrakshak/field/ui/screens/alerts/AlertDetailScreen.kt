package com.jalrakshak.field.ui.screens.alerts

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.jalrakshak.field.ui.components.*
import com.jalrakshak.field.ui.theme.*
import com.jalrakshak.field.ui.viewmodel.AlertDetailViewModel
import com.jalrakshak.field.ui.viewmodel.JalRakshakViewModelFactory

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AlertDetailScreen(
    alertId: String,
    onNavigateBack: () -> Unit,
    onNavigateToVerify: (String) -> Unit,
) {
    val viewModel: AlertDetailViewModel = viewModel(
        factory = JalRakshakViewModelFactory(LocalContext.current),
    )
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(alertId) {
        viewModel.setAlertId(alertId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Alert Details") },
                navigationIcon = { IconButton(onClick = onNavigateBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            )
        },
    ) { padding ->
            if (state.alert == null) {
        } else {
            val alert = state.alert!!
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.padding(padding).fillMaxSize()) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            PriorityBadge(alert.priority)
                            WarningLevelBadge(alert.warningLevel)
                            RiskLevelBadge(alert.level)
                        }
                        Text(alert.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    }
                }
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Risk", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("${alert.score}/100", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = when {
                                        alert.score >= 75 -> RiskRed; alert.score >= 55 -> RiskOrange; alert.score >= 32 -> RiskYellow; else -> RiskGreen
                                    })
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Confidence", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("${alert.confidence}%", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                                }
                            }
                            Divider()
                            Text("Location: ${alert.location?.name ?: "Unknown"}", style = MaterialTheme.typography.bodyMedium)
                            Text("Status: ${alert.status}", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }

                item {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            Text("Why this alert exists", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 8.dp))
                            alert.reasoning?.split("·")?.map { it.trim() }?.filter { it.isNotBlank() }?.forEach { reason ->
                                Row(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
                                    Text("✓ ", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodyMedium)
                                    Text(reason, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            } ?: Text(alert.message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }

                item {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            Text("Recommended Action", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 8.dp))
                            alert.recommendedAction.split("·").map { it.trim() }.filter { it.isNotBlank() }.forEach { action ->
                                Text("• $action", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 2.dp))
                            }
                        }
                    }
                }

                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                        if (alert.status != "ACKNOWLEDGED" && alert.status != "RESOLVED") {
                            OutlinedButton(onClick = { viewModel.acknowledge() }, enabled = !state.isActioning, modifier = Modifier.weight(1f)) { Text("Acknowledge") }
                        }
                        if (alert.status != "RESOLVED") {
                            Button(onClick = { viewModel.resolve() }, enabled = !state.isActioning, modifier = Modifier.weight(1f)) { Text("Resolve") }
                        }
                    }
                    if (alert.status != "RESOLVED") {
                        Spacer(Modifier.height(8.dp))
                        Button(onClick = { onNavigateToVerify(alert.id) }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = PriorityP1)) {
                            Icon(Icons.Filled.CheckCircle, null, Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Verify Field Cases")
                        }
                    }
                }

                if (state.error != null) {
                    item { Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) { Text(state.error!!, Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onErrorContainer) } }
                }
                if (state.actionSuccess != null) {
                    item { Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) { Text(state.actionSuccess!!, Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onPrimaryContainer) } }
                }
            }
        }
    }
}