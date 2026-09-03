package com.jalrakshak.field.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import com.jalrakshak.field.data.repository.ThemeMode

private val LightColorScheme = lightColorScheme(
    primary = WaterBlue,
    onPrimary = androidx.compose.ui.graphics.Color.White,
    primaryContainer = androidx.compose.ui.graphics.Color(0xFFD1E4FF),
    onPrimaryContainer = androidx.compose.ui.graphics.Color(0xFF001D36),
    secondary = androidx.compose.ui.graphics.Color(0xFF535F70),
    onSecondary = androidx.compose.ui.graphics.Color.White,
    secondaryContainer = androidx.compose.ui.graphics.Color(0xFFD7E3F7),
    onSecondaryContainer = androidx.compose.ui.graphics.Color(0xFF101C2B),
    background = SurfaceLight,
    onBackground = OnSurfaceLight,
    surface = SurfaceLight,
    onSurface = OnSurfaceLight,
    surfaceVariant = androidx.compose.ui.graphics.Color(0xFFDFE2EB),
    onSurfaceVariant = androidx.compose.ui.graphics.Color(0xFF43474E),
    error = androidx.compose.ui.graphics.Color(0xFFBA1A1A),
    onError = androidx.compose.ui.graphics.Color.White,
)

private val DarkColorScheme = darkColorScheme(
    primary = androidx.compose.ui.graphics.Color(0xFF9ECAFF),
    onPrimary = androidx.compose.ui.graphics.Color(0xFF003258),
    primaryContainer = androidx.compose.ui.graphics.Color(0xFF004A7C),
    onPrimaryContainer = androidx.compose.ui.graphics.Color(0xFFD1E4FF),
    secondary = androidx.compose.ui.graphics.Color(0xFFBBC7DB),
    onSecondary = androidx.compose.ui.graphics.Color(0xFF253140),
    secondaryContainer = androidx.compose.ui.graphics.Color(0xFF3B4858),
    onSecondaryContainer = androidx.compose.ui.graphics.Color(0xFFD7E3F7),
    background = SurfaceDark,
    onBackground = OnSurfaceDark,
    surface = SurfaceDark,
    onSurface = OnSurfaceDark,
    surfaceVariant = androidx.compose.ui.graphics.Color(0xFF43474E),
    onSurfaceVariant = androidx.compose.ui.graphics.Color(0xFFC3C7CF),
    error = androidx.compose.ui.graphics.Color(0xFFFFB4AB),
    onError = androidx.compose.ui.graphics.Color(0xFF690005),
)

@Composable
fun JalRakshakTheme(
    themeMode: ThemeMode = ThemeMode.SYSTEM,
    content: @Composable () -> Unit
) {
    val isDark = when (themeMode) {
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
    }

    val colorScheme = if (isDark) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.surface.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !isDark
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        shapes = Shapes,
        content = content
    )
}
