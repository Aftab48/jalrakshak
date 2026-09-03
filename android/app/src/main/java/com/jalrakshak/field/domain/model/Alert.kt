package com.jalrakshak.field.domain.model

data class Alert(
    val id: String,
    val status: String,
    val level: String,
    val score: Int,
    val priority: String,
    val confidence: Int,
    val warningLevel: String,
    val title: String,
    val message: String,
    val recommendedAction: String,
    val triggeredAt: String,
    val acknowledgedAt: String? = null,
    val resolvedAt: String? = null,
    val location: LocationMinimal? = null,
    val dominantSyndrome: String? = null,
    val reasoning: String? = null,
    val factors: Map<String, Double>? = null,
)