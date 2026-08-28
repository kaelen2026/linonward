package com.linonward.app.designsystem

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

/**
 * The rising arrow on a navy tile — the logo's two colours in their own pairing.
 *
 * Drawn rather than loaded: at one size, in one place, a `Canvas` costs less than an asset and
 * keeps the geometry beside the colours it uses. A `Canvas` publishes no semantics, so TalkBack
 * skips it, which is right — it is decoration beside a heading that already says the name.
 */
@Composable
fun BrandMark(modifier: Modifier = Modifier) {
  Canvas(modifier = modifier.size(56.dp)) {
    drawRoundRect(
      color = BrandColors.Navy900,
      cornerRadius = CornerRadius(x = 14.dp.toPx(), y = 14.dp.toPx()),
    )

    val stroke = Stroke(width = 3.5.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
    drawPath(
      path = polyline(0.22f to 0.70f, 0.42f to 0.48f, 0.56f to 0.62f, 0.76f to 0.34f),
      color = BrandColors.Teal500,
      style = stroke,
    )
    // The arrowhead, drawn as the corner the line runs into rather than as a
    // filled triangle: it stays legible at the sizes this mark is used at.
    drawPath(
      path = polyline(0.60f to 0.32f, 0.78f to 0.32f, 0.78f to 0.50f),
      color = BrandColors.Teal500,
      style = stroke,
    )
  }
}

/** Builds a path from fractions of the canvas, so the mark scales with whatever size it is given. */
private fun DrawScope.polyline(vararg points: Pair<Float, Float>): Path =
  Path().apply {
    points.forEachIndexed { index, (x, y) ->
      val pointX = size.width * x
      val pointY = size.height * y
      if (index == 0) moveTo(pointX, pointY) else lineTo(pointX, pointY)
    }
  }

@Preview(showBackground = true)
@Composable
private fun BrandMarkPreview() {
  LinOnwardTheme { BrandMark() }
}
