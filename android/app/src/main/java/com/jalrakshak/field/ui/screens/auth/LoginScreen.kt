package com.jalrakshak.field.ui.screens.auth

import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.jalrakshak.field.ui.theme.WaterBlue
import com.jalrakshak.field.ui.viewmodel.JalRakshakViewModelFactory
import com.jalrakshak.field.ui.viewmodel.LoginViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = viewModel(factory = JalRakshakViewModelFactory(LocalContext.current)),
) {
    val state by viewModel.uiState.collectAsState()
    var workerId by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var showPin by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current

    LaunchedEffect(state.worker) {
        if (state.worker != null) onLoginSuccess()
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(Icons.Filled.WaterDrop, null, tint = WaterBlue, modifier = Modifier.size(72.dp))
        Spacer(Modifier.height(16.dp))
        Text("JalRakshak", style = MaterialTheme.typography.headlineMedium)
        Text("Field Worker Login", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(32.dp))

        OutlinedTextField(workerId, { workerId = it }, label = { Text("Worker ID") }, singleLine = true, leadingIcon = { Icon(Icons.Filled.Badge, null) }, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next))
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = pin, onValueChange = { pin = it }, label = { Text("PIN") }, singleLine = true,
            visualTransformation = if (showPin) VisualTransformation.None else PasswordVisualTransformation(),
            leadingIcon = { Icon(Icons.Filled.Lock, null) },
            trailingIcon = { IconButton(onClick = { showPin = !showPin }) { Icon(if (showPin) Icons.Filled.VisibilityOff else Icons.Filled.Visibility, null) } },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus(); if (workerId.isNotBlank() && pin.isNotBlank()) viewModel.login(workerId, pin) }),
        )

        Spacer(Modifier.height(24.dp))
        Button(
            onClick = { focusManager.clearFocus(); viewModel.login(workerId, pin) },
            enabled = workerId.isNotBlank() && pin.isNotBlank() && !state.isLoading,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            colors = ButtonDefaults.buttonColors(containerColor = WaterBlue),
        ) {
            if (state.isLoading) CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
            else Text("Sign in", style = MaterialTheme.typography.titleMedium)
        }

        AnimatedVisibility(visible = state.error != null) {
            Card(modifier = Modifier.fillMaxWidth().padding(top = 12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                Text(state.error ?: "", Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onErrorContainer, style = MaterialTheme.typography.bodyMedium)
            }
        }

        Spacer(Modifier.height(24.dp))
        Text("Demo workers:\nASHA-001 (PIN: 1234)\nANM-001 (PIN: 5678)\nFW-001 (PIN: 9012)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
    }
}