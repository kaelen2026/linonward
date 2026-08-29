package com.linonward.app.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Button
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.linonward.app.R

/**
 * The frame every screen sits in: the app name in a transparent bar, the brand wash behind it, and
 * a column that stops widening on a tablet.
 *
 * @param content receives the modifier to apply to its root, already carrying the width cap and the
 *   insets the bar consumed. Handing it down rather than wrapping the content means a screen can
 *   still choose to scroll, which a fixed wrapper would have decided for it.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScreenScaffold(
  modifier: Modifier = Modifier,
  actions: @Composable RowScope.() -> Unit = {},
  content: @Composable (Modifier) -> Unit,
) {
  Scaffold(
    modifier =
      modifier.fillMaxSize().background(
        // The same teal wash the iOS screens carry: enough to tint the top of
        // the screen, nowhere near enough to be a text background.
        Brush.verticalGradient(listOf(BrandColors.Teal500.copy(alpha = 0.12f), Color.Transparent))
      ),
    // Transparent, or the Scaffold would paint over the wash it sits on.
    containerColor = Color.Transparent,
    topBar = {
      CenterAlignedTopAppBar(
        title = { Text(stringResource(R.string.app_name)) },
        actions = actions,
        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent),
      )
    },
  ) { insets ->
    Box(modifier = Modifier.fillMaxSize().padding(insets), contentAlignment = Alignment.TopCenter) {
      // 560dp is where a line of text stops being comfortable to read; past it
      // a tablet would stretch the form across the whole screen.
      content(Modifier.widthIn(max = DesignTokens.Size.ContentMaximumWidth.dp).fillMaxSize())
    }
  }
}

/**
 * The one call to action on a screen, full width, with a spinner that replaces the label rather
 * than sitting beside it — so the row does not resize when a request starts.
 */
@Composable
fun PrimaryButton(
  onClick: () -> Unit,
  enabled: Boolean,
  busy: Boolean,
  modifier: Modifier = Modifier,
  content: @Composable RowScope.() -> Unit,
) {
  Button(
    onClick = onClick,
    // A busy button is disabled whatever the caller says: the flow's own guards
    // already refuse a second submission, and a tappable spinner invites one.
    enabled = enabled && !busy,
    modifier =
      modifier.fillMaxWidth().heightIn(min = DesignTokens.Size.PrimaryButtonMinimumHeight.dp),
  ) {
    if (busy) {
      CircularProgressIndicator(
        modifier = Modifier.size(20.dp),
        color = LocalContentColor.current,
        strokeWidth = 2.dp,
      )
    } else {
      content()
    }
  }
}
