package com.jalrakshak.field.ui.screens.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.jalrakshak.field.data.repository.toDomain
import com.jalrakshak.field.domain.model.Location
import com.jalrakshak.field.ui.components.*
import com.jalrakshak.field.ui.viewmodel.JalRakshakViewModelFactory

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocationsScreen(onNavigateBack: () -> Unit) {
    var locations by remember { mutableStateOf<List<Location>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        try {
            val apiClient = (context.applicationContext as com.jalrakshak.field.JalRakshakApplication).apiClient
            val resp = apiClient.api.getLocations()
            if (resp.ok) {
                locations = resp.locations.map { it.toDomain() }
            }
        } catch (_: Exception) {}
        isLoading = false
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Locations") }, navigationIcon = { IconButton(onClick = onNavigateBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } }) },
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        } else if (locations.isEmpty()) {
            EmptyState(title = "No locations found", subtitle = "", modifier = Modifier.fillMaxSize().padding(padding))
        } else {
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(padding).fillMaxSize()) {
                items(locations.size) { idx ->
                    val location = locations[idx]
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(location.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Medium)
                                location.risk?.let { RiskLevelBadge(it.level) }
                            }
                            Text(location.district, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("Pop: ${location.population}  ·  HH: ${location.households}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            location.risk?.let { risk ->
                                Text("Risk: ${risk.score}/100  ·  Confidence: ${risk.confidence}%", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                            }
                        }
                    }
                }
            }
        }
    }
}