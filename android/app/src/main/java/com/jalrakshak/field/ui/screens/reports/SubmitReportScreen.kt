package com.jalrakshak.field.ui.screens.reports

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import com.jalrakshak.field.domain.model.SymptomVocabulary
import com.jalrakshak.field.ui.theme.WaterBlue
import com.jalrakshak.field.ui.viewmodel.JalRakshakViewModelFactory
import com.jalrakshak.field.ui.viewmodel.SubmitReportViewModel

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SubmitReportScreen(
    onNavigateBack: () -> Unit,
    onNavigateToLocations: () -> Unit,
    viewModel: SubmitReportViewModel = viewModel(factory = JalRakshakViewModelFactory(LocalContext.current)),
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.isSubmitted) { if (state.isSubmitted) onNavigateBack() }

    Scaffold(
        topBar = { TopAppBar(title = { Text("New Report") }, navigationIcon = { IconButton(onClick = onNavigateBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } }) },
    ) { padding ->
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.padding(padding).fillMaxSize()) {
            item {
                Text("Submit Health Report", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("Record symptoms observed in the field", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Location", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = 8.dp))
                        Text(state.locationName.ifBlank { "Assigned area" }, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                        Text("Report will be filed under your assigned area", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Symptoms (select 1-6)", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = 8.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            SymptomVocabulary.symptoms.forEach { symptom ->
                                FilterChip(selected = symptom in state.selectedSymptoms, onClick = { viewModel.updateSymptom(symptom, symptom !in state.selectedSymptoms) }, label = { Text(SymptomVocabulary.displayName(symptom)) })
                            }
                        }
                    }
                }
            }

            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Duration (days)", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = 8.dp))
                        Slider(value = state.durationDays.toFloat(), onValueChange = { viewModel.updateDuration(it.toInt()) }, valueRange = 1f..14f, steps = 13)
                        Text("${state.durationDays} days", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                    }
                }
            }

            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Severity", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = 8.dp))
                        Slider(value = state.severity.toFloat(), onValueChange = { viewModel.updateSeverity(it.toInt()) }, valueRange = 1f..5f, steps = 3)
                        Text("${state.severity}/5", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                    }
                }
            }

            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Age group", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = 8.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            SymptomVocabulary.ageBands.forEach { band ->
                                FilterChip(selected = state.ageBand == band, onClick = { viewModel.updateAgeBand(band) }, label = { Text(band) })
                            }
                        }
                    }
                }
            }

            item {
                OutlinedTextField(state.affectedPeople.toString(), { viewModel.updateAffectedPeople(it.toIntOrNull() ?: 1) }, label = { Text("Number of affected people") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth())
            }

            item {
                OutlinedTextField(state.notes, { viewModel.updateNotes(it) }, label = { Text("Notes (optional)") }, modifier = Modifier.fillMaxWidth(), minLines = 2, maxLines = 4)
            }

            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(onClick = { viewModel.submit() }, enabled = !state.isSaving, modifier = Modifier.weight(1f).height(48.dp), colors = ButtonDefaults.buttonColors(containerColor = WaterBlue)) {
                        if (state.isSaving) CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        else Text("Submit Report")
                    }
                }
            }

            state.error?.let { err ->
                item { Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) { Text(err, Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onErrorContainer) } }
            }
        }
    }
}