package com.jalrakshak.field.ui.screens.profile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.jalrakshak.field.ui.theme.*
import com.jalrakshak.field.ui.viewmodel.JalRakshakViewModelFactory
import com.jalrakshak.field.ui.viewmodel.SyncStatusViewModel
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SyncStatusScreen(
    onNavigateBack: () -> Unit,
    viewModel: SyncStatusViewModel = viewModel(factory = JalRakshakViewModelFactory(LocalContext.current)),
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Sync Status") }, navigationIcon = { IconButton(onClick = onNavigateBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } }) },
    ) { padding ->
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.padding(padding).fillMaxSize()) {
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                if (state.isOnline) Icons.Filled.Wifi else Icons.Filled.WifiOff,
                                null,
                                tint = if (state.isOnline) SyncGreen else SyncRed,
                                modifier = Modifier.size(24.dp),
                            )
                            Spacer(Modifier.width(12.dp))
                            Text(if (state.isOnline) "Online" else "Offline", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = if (state.isOnline) SyncGreen else SyncRed)
                        }
                        Divider()
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Pending reports", style = MaterialTheme.typography.bodyMedium)
                            Text("${state.pendingReports}", fontWeight = FontWeight.Medium)
                        }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Pending inspections", style = MaterialTheme.typography.bodyMedium)
                            Text("${state.pendingInspections}", fontWeight = FontWeight.Medium)
                        }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Pending sync total", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                            Text("${state.pendingSync}", fontWeight = FontWeight.Bold)
                        }
                        if (state.failedSync > 0) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Failed", style = MaterialTheme.typography.bodyMedium, color = SyncRed)
                                Text("${state.failedSync}", color = SyncRed, fontWeight = FontWeight.Bold)
                            }
                        }
                        state.lastSyncedAt?.let { ts ->
                            Text("Last synced: ${SimpleDateFormat("dd MMM HH:mm", Locale.getDefault()).format(Date(ts))}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        } ?: Text("Not yet synced", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            item {
                Button(
                    onClick = { viewModel.syncNow() },
                    enabled = state.isOnline && !state.isSyncing,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                ) {
                    if (state.isSyncing) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp))
                        Text("Syncing...")
                    } else {
                        Icon(Icons.Filled.Sync, null, Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Sync Now")
                    }
                }
            }
        }
    }
}