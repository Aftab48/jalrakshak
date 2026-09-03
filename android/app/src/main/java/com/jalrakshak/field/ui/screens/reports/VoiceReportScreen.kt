package com.jalrakshak.field.ui.screens.reports

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import com.jalrakshak.field.ui.theme.WaterBlue
import com.jalrakshak.field.ui.viewmodel.JalRakshakViewModelFactory
import com.jalrakshak.field.ui.viewmodel.VoiceReportViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VoiceReportScreen(
    onNavigateBack: () -> Unit,
    viewModel: VoiceReportViewModel = viewModel(factory = JalRakshakViewModelFactory(LocalContext.current)),
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.isSubmitted) { if (state.isSubmitted) onNavigateBack() }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Voice Report") }, navigationIcon = { IconButton(onClick = onNavigateBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } }) },
    ) { padding ->
        Column(
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        ) {
            Text("Report by Voice", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Type or paste transcribed text from a voice recording", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)

            if (state.isSimulated) {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer)) {
                    Text("Demo / Simulated recognition (no real ASR backend)", Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onTertiaryContainer, style = MaterialTheme.typography.bodySmall)
                }
            }

            OutlinedTextField(state.recognizedText, { viewModel.updateText(it) }, label = { Text("Voice transcription text") }, modifier = Modifier.fillMaxWidth().height(150.dp), minLines = 3, maxLines = 6)

            Button(onClick = { viewModel.parse() }, enabled = state.recognizedText.isNotBlank() && !state.isRecognizing, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = WaterBlue)) {
                if (state.isRecognizing) CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                else Text("Parse Voice Report")
            }

            state.parseResult?.let { result ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Parsed Results", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        if (result.symptoms.isEmpty()) {
                            Text("No symptoms detected", color = MaterialTheme.colorScheme.error)
                        } else {
                            Text("Language: ${result.language}", style = MaterialTheme.typography.bodyMedium)
                            Text("Symptoms: ${result.symptoms.joinToString(", ")}", style = MaterialTheme.typography.bodyMedium)
                            result.durationDays?.let { Text("Duration: $it days", style = MaterialTheme.typography.bodyMedium) }
                            Text("Severity: ${result.severity}/5", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
                Button(onClick = { viewModel.submit() }, enabled = result.symptoms.isNotEmpty(), modifier = Modifier.fillMaxWidth()) { Text("Submit as Report") }
            }

            state.error?.let { err ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) { Text(err, Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onErrorContainer) }
            }
        }
    }
}