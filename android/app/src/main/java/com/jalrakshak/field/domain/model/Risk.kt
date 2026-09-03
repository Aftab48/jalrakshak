package com.jalrakshak.field.domain.model

data class Risk(
    val score: Int,
    val level: String,
    val confidence: Int,
    val warningLevel: String,
    val priority: String,
    val dominantSyndrome: String? = null,
    val factors: Map<String, Double>? = null,
    val reasoning: String? = null,
)