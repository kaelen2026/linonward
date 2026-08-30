package com.linonward.app.feature.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.linonward.app.R
import com.linonward.app.designsystem.BrandMark
import com.linonward.app.designsystem.LinOnwardTheme
import com.linonward.app.designsystem.ScreenScaffold
import com.linonward.app.feature.authentication.AuthenticatedUser

@Composable
fun HomeScreen(
  user: AuthenticatedUser,
  onOpenReader: () -> Unit,
  onSignOut: () -> Unit,
  modifier: Modifier = Modifier,
) {
  var menuOpen by remember { mutableStateOf(false) }
  // Survives a rotation: a confirmation that vanished when the device turned
  // would look like the sign-out had happened.
  var confirmingSignOut by rememberSaveable { mutableStateOf(false) }

  ScreenScaffold(
    modifier = modifier,
    actions = {
      Box {
        // A menu rather than a bare button: signing out is destructive enough
        // that it should not sit one tap from the app bar, and the menu is also
        // where the signed-in address belongs.
        TextButton(onClick = { menuOpen = true }) {
          Text(stringResource(R.string.home_account))
        }
        DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
          Text(
            text = user.email,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
          )
          HorizontalDivider()
          DropdownMenuItem(
            text = {
              Text(
                text = stringResource(R.string.home_sign_out),
                color = MaterialTheme.colorScheme.error,
              )
            },
            onClick = {
              menuOpen = false
              confirmingSignOut = true
            },
          )
        }
      }
    },
  ) { contentModifier ->
    Column(
      modifier = contentModifier.verticalScroll(rememberScrollState()).padding(24.dp),
      verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
      BrandMark()

      Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
          text = stringResource(R.string.home_eyebrow),
          style = MaterialTheme.typography.labelLarge,
          // The accessible teal in both schemes — Teal800 on white, Teal300 on
          // navy. The brand Teal500 is 2.61:1 on white and is never text there.
          color = MaterialTheme.colorScheme.onTertiaryContainer,
        )
        Text(
          text = stringResource(R.string.home_title),
          style = MaterialTheme.typography.displaySmall,
        )
        Text(
          text = stringResource(R.string.home_body),
          style = MaterialTheme.typography.bodyLarge,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
      }

      Surface(
        color = MaterialTheme.colorScheme.surfaceVariant,
        contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
        shape = MaterialTheme.shapes.medium,
        modifier = Modifier.fillMaxWidth(),
      ) {
        Text(
          text = stringResource(R.string.home_greeting, user.name),
          modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
          style = MaterialTheme.typography.bodyMedium,
        )
      }
      TextButton(onClick = onOpenReader) {
        Text(stringResource(R.string.home_open_reader))
      }
    }
  }

  if (confirmingSignOut) {
    AlertDialog(
      onDismissRequest = { confirmingSignOut = false },
      title = { Text(stringResource(R.string.home_sign_out_confirm)) },
      text = { Text(user.email) },
      confirmButton = {
        TextButton(
          onClick = {
            confirmingSignOut = false
            onSignOut()
          }
        ) {
          Text(
            text = stringResource(R.string.home_sign_out),
            color = MaterialTheme.colorScheme.error,
          )
        }
      },
      dismissButton = {
        TextButton(onClick = { confirmingSignOut = false }) {
          Text(stringResource(R.string.common_cancel))
        }
      },
    )
  }
}

@Preview(showBackground = true)
@Composable
private fun HomePreview() {
  LinOnwardTheme {
    HomeScreen(
      user = AuthenticatedUser(id = "user_1", email = "ada@example.com", name = "Ada"),
      onOpenReader = {},
      onSignOut = {},
    )
  }
}
