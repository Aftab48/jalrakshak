package com.jalrakshak.field.ui.screens.reports

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.jalrakshak.field.domain.model.HealthReport
import com.jalrakshak.field.ui.components.EmptyState
import com.jalrakshak.field.ui.theme.WaterBlue
import com.jalrakshak.field.ui.viewmodel.JalRakshakViewModelFactory
import com.jalrakshak.field.ui.viewmodel.ReportsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(
    onNavigateToSubmitReport: () -> Unit,
    onNavigateToVoiceReport: () -> Unit,
    viewModel: ReportsViewModel = viewModel(factory = JalRakshakViewModelFactory(LocalContext.current)),
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Reports") }) },
        floatingActionButton = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SmallFloatingActionButton(onClick = onNavigateToVoiceReport, containerColor = MaterialTheme.colorScheme.secondaryContainer) { Icon(Icons.Filled.Mic, "Voice Report") }
                FloatingActionButton(onClick = onNavigateToSubmitReport, containerColor = WaterBlue) { Icon(Icons.Filled.Add, "New Report") }
            }
        },
    ) { padding ->
        if (state.reports.isEmpty() && !state.isLoading) {
            EmptyState(title = "No reports yet", subtitle = "Tap + to submit your first field report", modifier = Modifier.fillMaxSize().padding(padding))
        } else {
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(padding).fillMaxSize()) {
                items(state.reports, key = { it.id }) { report ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(report.symptoms.joinToString(", ") { com.jalrakshak.field.domain.model.SymptomVocabulary.displayName(it) }, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Medium)
                                Text("Sev: ${report.severity}/5", style = MaterialTheme.typography.bodySmall)
                            }
                            report.locationName?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                            Text("Source: ${report.source}  ·  ${report.onsetAt.take(10)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}