package com.linonward.app.designsystem

import androidx.compose.ui.graphics.Color

/**
 * The brand ramps, sampled from `apps/www/public/logo.png` and shared with the website.
 *
 * These are the sRGB equivalents of the `oklch()` steps in `apps/www/src/app/globals.css`, and they
 * are static: identical in light and dark, exactly as in the `@theme` block there. Only the
 * semantic mapping in [LinOnwardTheme] flips.
 *
 * The two anchors are the colours in the mark itself — `Navy900` is the L, `Teal500` the rising
 * arrow — and are written as the logo's own hex rather than as a conversion of the OKLCH value,
 * which rounds a channel differently.
 *
 * One rule the ramp cannot express: **Teal500 is 2.61:1 on white**, so it is never body text on a
 * light surface. It is a *surface* whose label is Navy900 (5.73:1), which is the pairing the logo
 * uses. For teal text on white, step down to Teal700 (5.44:1). See docs/design-system.md.
 */
internal object BrandColors {
  val Navy50 = Color(0xFFF2F7FE)
  val Navy100 = Color(0xFFE4EEFA)
  val Navy200 = Color(0xFFCEDEF2)
  val Navy300 = Color(0xFFB1C8E5)
  val Navy400 = Color(0xFF94B4DB)
  val Navy500 = Color(0xFF789FCE)
  val Navy600 = Color(0xFF5E83AF)
  val Navy700 = Color(0xFF44658E)
  val Navy800 = Color(0xFF27466B)
  val Navy900 = Color(0xFF03274D)
  val Navy950 = Color(0xFF00112D)

  val Teal50 = Color(0xFFECFAFA)
  val Teal100 = Color(0xFFD8F3F3)
  val Teal200 = Color(0xFFB9E7E6)
  val Teal300 = Color(0xFF8FD4D4)
  val Teal400 = Color(0xFF5DC4C4)
  val Teal500 = Color(0xFF0DB2B3)
  val Teal600 = Color(0xFF009596)
  val Teal700 = Color(0xFF007677)
  val Teal800 = Color(0xFF005557)
  val Teal900 = Color(0xFF003639)
  val Teal950 = Color(0xFF001B1F)

  val DestructiveLight = Color(0xFFE7000B)
  val DestructiveDark = Color(0xFFFF6467)
}
