package com.jalrakshak.field.ui.screens.water

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
import com.jalrakshak.field.domain.model.WaterSource
import com.jalrakshak.field.ui.components.*
import com.jalrakshak.field.ui.theme.WaterBlue
import com.jalrakshak.field.ui.viewmodel.JalRakshakViewModelFactory
import com.jalrakshak.field.ui.viewmodel.WaterViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WaterScreen(
    onNavigateToInspection: (String, String) -> Unit,
    viewModel: WaterViewModel = viewModel(factory = JalRakshakViewModelFactory(LocalContext.current)),
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Water Sources") }) },
    ) { padding ->
        if (state.waterSources.isEmpty() && !state.isLoading) {
            EmptyState(title = "No water sources", subtitle = "No sources found for this area", modifier = Modifier.fillMaxSize().padding(padding))
        } else {
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(padding).fillMaxSize()) {
                items(state.waterSources, key = { it.id }) { source ->
                    WaterSourceCard(source = source, onInspect = { onNavigateToInspection(source.id, source.name) })
                }
            }
        }
    }
}

@Composable
fun WaterSourceCard(source: WaterSource, onInspect: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(source.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Medium)
                WaterStatusBadge(source.status)
            }
            Text("Type: ${source.type.replace("_", " ").lowercase().replaceFirstChar { it.uppercase() }}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            source.latestObservation?.let { obs ->
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    obs.turbidityNTU?.let { Text("Turbidity: ${it} NTU", style = MaterialTheme.typography.bodySmall) }
                    obs.ph?.let { Text("pH: $it", style = MaterialTheme.typography.bodySmall) }
                    obs.ecoliDetected?.let { if (it) Text("E. coli detected!", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) }
                }
            }
            Button(onClick = onInspect, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = WaterBlue)) {
                Icon(Icons.Filled.WaterDrop, null, Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Start Inspection")
            }
        }
    }
}