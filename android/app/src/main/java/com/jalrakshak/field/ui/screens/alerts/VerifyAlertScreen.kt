package com.jalrakshak.field.ui.screens.alerts

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.jalrakshak.field.domain.model.SymptomVocabulary
import com.jalrakshak.field.ui.theme.WaterBlue
import com.jalrakshak.field.ui.viewmodel.JalRakshakViewModelFactory
import com.jalrakshak.field.ui.viewmodel.VerifyAlertViewModel
import androidx.compose.foundation.layout.ExperimentalLayoutApi

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun VerifyAlertScreen(
    alertId: String,
    onNavigateBack: () -> Unit,
    viewModel: VerifyAlertViewModel = viewModel(factory = JalRakshakViewModelFactory(LocalContext.current)),
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(alertId) {
        viewModel.setAlertId(alertId)
    }

    LaunchedEffect(state.isSubmitted) {
        if (state.isSubmitted) onNavigateBack()
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Verify Alert") }, navigationIcon = { IconButton(onClick = onNavigateBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } }) },
    ) { padding ->
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.padding(padding).fillMaxSize()) {
            item { Text("Field Verification", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold) }

            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Are cases currently present?", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = 8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            listOf("YES", "NO", "UNCLEAR").forEach { option ->
                                FilterChip(selected = state.casesPresent == option, onClick = { viewModel.setCasesPresent(option) }, label = { Text(option) })
                            }
                        }
                    }
                }
            }

            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        OutlinedTextField(state.affectedPeople.toString(), { viewModel.setAffectedPeople(it.toIntOrNull() ?: 0) }, label = { Text("Affected people") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(state.affectedHouseholds.toString(), { viewModel.setAffectedHouseholds(it.toIntOrNull() ?: 0) }, label = { Text("Affected households") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth())
                    }
                }
            }

            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Observed symptoms", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = 8.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            SymptomVocabulary.symptoms.forEach { symptom ->
                                FilterChip(selected = symptom in state.selectedSymptoms, onClick = { viewModel.toggleSymptom(symptom) }, label = { Text(SymptomVocabulary.displayName(symptom)) })
                            }
                        }
                    }
                }
            }

            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Water source condition", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = 8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("NORMAL", "SUSPICIOUS", "POOR").forEach { cond ->
                                FilterChip(selected = state.waterCondition == cond, onClick = { viewModel.setWaterCondition(cond) }, label = { Text(cond) })
                            }
                        }
                    }
                }
            }

            item {
                OutlinedTextField(state.notes, { viewModel.setNotes(it) }, label = { Text("Notes (optional)") }, modifier = Modifier.fillMaxWidth(), minLines = 2, maxLines = 4)
            }

            item {
                Button(onClick = { viewModel.submit() }, enabled = !state.isSaving, modifier = Modifier.fillMaxWidth().height(48.dp), colors = ButtonDefaults.buttonColors(containerColor = WaterBlue)) {
                    if (state.isSaving) CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text("Submit Verification")
                }
            }

            state.error?.let { err ->
                item { Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) { Text(err, Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onErrorContainer) } }
            }
        }
    }
}