package com.jalrakshak.field.ui.screens.water

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.jalrakshak.field.ui.theme.WaterBlue
import com.jalrakshak.field.ui.viewmodel.JalRakshakViewModelFactory
import com.jalrakshak.field.ui.viewmodel.WaterInspectionViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WaterInspectionScreen(
    sourceId: String,
    sourceName: String,
    onNavigateBack: () -> Unit,
    viewModel: WaterInspectionViewModel = viewModel(factory = JalRakshakViewModelFactory(LocalContext.current)),
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(sourceId) { viewModel.setSource(sourceId, sourceName) }
    LaunchedEffect(state.isSubmitted) { if (state.isSubmitted) onNavigateBack() }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Water Inspection") }, navigationIcon = { IconButton(onClick = onNavigateBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } }) },
    ) { padding ->
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.padding(padding).fillMaxSize()) {
            item { Text("Inspect: $sourceName", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold) }

            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(state.turbidity, { viewModel.updateTurbidity(it) }, label = { Text("Turbidity (NTU)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(state.ph, { viewModel.updatePh(it) }, label = { Text("pH") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(state.tds, { viewModel.updateTds(it) }, label = { Text("TDS (mg/L)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(state.freeChlorine, { viewModel.updateFreeChlorine(it) }, label = { Text("Free Chlorine (mg/L)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth())
                    }
                }
            }

            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text("E. coli detected?", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = 8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            FilterChip(selected = state.ecoliDetected == true, onClick = { viewModel.updateEcoli(true) }, label = { Text("Detected") })
                            FilterChip(selected = state.ecoliDetected == false, onClick = { viewModel.updateEcoli(false) }, label = { Text("Not detected") })
                            FilterChip(selected = state.ecoliDetected == null, onClick = { viewModel.updateEcoli(null) }, label = { Text("Unknown") })
                        }
                    }
                }
            }

            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Visual condition", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = 8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("NORMAL", "SUSPICIOUS", "POOR").forEach { cond ->
                                FilterChip(selected = state.visualCondition == cond, onClick = { viewModel.updateVisualCondition(cond) }, label = { Text(cond) })
                            }
                        }
                    }
                }
            }

            item {
                OutlinedTextField(state.notes, { viewModel.updateNotes(it) }, label = { Text("Notes (optional)") }, modifier = Modifier.fillMaxWidth(), minLines = 2, maxLines = 4)
            }

            item {
                Button(onClick = { viewModel.submit() }, enabled = !state.isSaving, modifier = Modifier.fillMaxWidth().height(48.dp), colors = ButtonDefaults.buttonColors(containerColor = WaterBlue)) {
                    if (state.isSaving) CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text("Submit Inspection")
                }
            }

            state.error?.let { err ->
                item { Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) { Text(err, Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onErrorContainer) } }
            }
        }
    }
}