package com.linonward.app.designsystem

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * The semantic layer: which ramp step each role points at, and the only thing that flips between
 * light and dark. Retuning a colour means editing here and nowhere else.
 *
 * **No dynamic colour.** Material You would repaint the app from the device wallpaper, which is
 * precisely the brand identity this ramp exists to carry — the same reason the website has no theme
 * toggle. Dark mode follows the system setting, and nothing else does.
 */
private val LightColors =
  lightColorScheme(
    primary = BrandColors.Navy900,
    onPrimary = BrandColors.Navy50,
    primaryContainer = BrandColors.Navy100,
    onPrimaryContainer = BrandColors.Navy900,
    secondary = BrandColors.Navy50,
    onSecondary = BrandColors.Navy800,
    secondaryContainer = BrandColors.Navy100,
    onSecondaryContainer = BrandColors.Navy800,
    // The brand teal, as a *surface* with a navy label — never as text on white.
    tertiary = BrandColors.Teal500,
    onTertiary = BrandColors.Navy900,
    tertiaryContainer = BrandColors.Teal50,
    onTertiaryContainer = BrandColors.Teal800,
    background = Color.White,
    onBackground = BrandColors.Navy900,
    surface = Color.White,
    onSurface = BrandColors.Navy900,
    surfaceVariant = BrandColors.Navy50,
    onSurfaceVariant = BrandColors.Navy700,
    surfaceContainer = BrandColors.Navy50,
    surfaceContainerHigh = BrandColors.Navy100,
    error = BrandColors.DestructiveLight,
    onError = Color.White,
    outline = BrandColors.Navy300,
    outlineVariant = BrandColors.Navy200,
  )

private val DarkColors =
  darkColorScheme(
    // Navy on navy would vanish, so dark promotes the teal to the primary
    // action colour, labelled with the darkest navy.
    primary = BrandColors.Teal500,
    onPrimary = BrandColors.Navy950,
    primaryContainer = BrandColors.Teal900,
    onPrimaryContainer = BrandColors.Teal300,
    secondary = BrandColors.Navy800,
    onSecondary = BrandColors.Navy50,
    secondaryContainer = BrandColors.Navy800,
    onSecondaryContainer = BrandColors.Navy50,
    tertiary = BrandColors.Teal500,
    onTertiary = BrandColors.Navy950,
    tertiaryContainer = BrandColors.Teal900,
    onTertiaryContainer = BrandColors.Teal300,
    background = BrandColors.Navy950,
    onBackground = BrandColors.Navy50,
    surface = BrandColors.Navy950,
    onSurface = BrandColors.Navy50,
    surfaceVariant = BrandColors.Navy900,
    onSurfaceVariant = BrandColors.Navy400,
    surfaceContainer = BrandColors.Navy900,
    surfaceContainerHigh = BrandColors.Navy800,
    error = BrandColors.DestructiveDark,
    onError = BrandColors.Navy950,
    outline = BrandColors.Navy700,
    outlineVariant = BrandColors.Navy800,
  )

/**
 * Typography is Material 3's default on purpose. The one house rule that matters here is a
 * subtraction: no `uppercase` and no widened letter spacing on shared text styles, because both are
 * useless or harmful in Chinese, and half this app's copy is Chinese.
 */
@Composable
fun LinOnwardTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
  MaterialTheme(colorScheme = if (darkTheme) DarkColors else LightColors, content = content)
}
