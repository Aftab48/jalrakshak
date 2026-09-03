package com.jalrakshak.field.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.jalrakshak.field.ui.theme.*

@Composable
fun PriorityBadge(priority: String, modifier: Modifier = Modifier) {
    val (bg, fg) = when (priority) {
        "P0" -> PriorityP0 to Color.White
        "P1" -> PriorityP1 to Color.White
        "P2" -> PriorityP2 to Color.Black
        "P3" -> PriorityP3 to Color.White
        else -> MaterialTheme.colorScheme.outline to MaterialTheme.colorScheme.onSurface
    }
    Text(
        text = priority,
        color = fg,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Bold,
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 3.dp),
    )
}

@Composable
fun WarningLevelBadge(level: String, modifier: Modifier = Modifier) {
    val (bg, fg) = when (level) {
        "OUTBREAK" -> WarningOutbreak to Color.White
        "EARLY_WARNING" -> WarningEarly to Color.White
        "WATCH" -> WarningWatch to Color.Black
        "NORMAL" -> WarningNormal to Color.White
        else -> MaterialTheme.colorScheme.outline to MaterialTheme.colorScheme.onSurface
    }
    Text(
        text = level.replace("_", " "),
        color = fg,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Medium,
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 3.dp),
    )
}

@Composable
fun RiskLevelBadge(level: String, modifier: Modifier = Modifier) {
    val (bg, fg) = when (level) {
        "CRITICAL" -> RiskRed to Color.White
        "HIGH" -> RiskOrange to Color.White
        "MODERATE" -> RiskYellow to Color.Black
        "LOW" -> RiskGreen to Color.White
        else -> MaterialTheme.colorScheme.outline to MaterialTheme.colorScheme.onSurface
    }
    Text(
        text = level,
        color = fg,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Bold,
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 3.dp),
    )
}

@Composable
fun WaterStatusBadge(status: String, modifier: Modifier = Modifier) {
    val (bg, fg) = when (status) {
        "CONTAMINATED" -> PriorityP0 to Color.White
        "SUSPECTED" -> PriorityP1 to Color.White
        "WATCH" -> PriorityP2 to Color.Black
        "NORMAL" -> SyncGreen to Color.White
        else -> MaterialTheme.colorScheme.outline to MaterialTheme.colorScheme.onSurface
    }
    Text(
        text = status,
        color = fg,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Medium,
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 3.dp),
    )
}

@Composable
fun SyncIndicator(synced: Boolean, modifier: Modifier = Modifier) {
    val color = if (synced) SyncGreen else SyncYellow
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier,
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(color),
        )
        Spacer(Modifier.width(6.dp))
        Text(
            text = if (synced) "Synced" else "Pending sync",
            style = MaterialTheme.typography.bodySmall,
            color = color,
        )
    }
}

@Composable
fun EmptyState(title: String, subtitle: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}