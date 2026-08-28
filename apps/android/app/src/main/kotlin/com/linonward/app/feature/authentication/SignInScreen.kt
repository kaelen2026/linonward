package com.linonward.app.feature.authentication

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.linonward.app.R
import com.linonward.app.designsystem.BrandMark
import com.linonward.app.designsystem.LinOnwardTheme
import com.linonward.app.designsystem.PrimaryButton
import com.linonward.app.designsystem.ScreenScaffold

/**
 * Email address, then the six-digit code sent to it.
 *
 * Stateless: it renders an [AuthenticationState] and reports intent. That is what lets every screen
 * below have a preview, and what keeps the flow's rules in a value the tests can drive directly.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignInScreen(
  state: AuthenticationState,
  onEmailChange: (String) -> Unit,
  onCodeChange: (String) -> Unit,
  onSubmit: () -> Unit,
  onEditEmail: () -> Unit,
  modifier: Modifier = Modifier,
) {
  val awaitingCode = state.step == AuthenticationState.Step.Code
  val codeFocus = remember { FocusRequester() }
  val keyboard = LocalSoftwareKeyboardController.current

  // Moving to the code step puts the caret in the code field, so the code from
  // the mail can go straight in. The email step deliberately does not grab
  // focus: throwing a keyboard over the screen on launch hides half of it
  // before anybody has asked to type.
  LaunchedEffect(awaitingCode) {
    if (awaitingCode) codeFocus.requestFocus()
  }

  ScreenScaffold(modifier = modifier) { contentModifier ->
    Column(
      modifier = contentModifier.verticalScroll(rememberScrollState()).padding(24.dp),
      verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
      BrandMark()

      Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
          text = stringResource(R.string.sign_in_title),
          style = MaterialTheme.typography.displaySmall,
        )
        Text(
          text =
            if (awaitingCode) {
              // Naming the address on the code step is what makes a typo
              // recoverable — otherwise there is nothing on screen to check it
              // against.
              stringResource(R.string.sign_in_subtitle_code, state.email)
            } else {
              stringResource(R.string.sign_in_subtitle_email)
            },
          style = MaterialTheme.typography.bodyMedium,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
      }

      OutlinedTextField(
        value = state.email,
        onValueChange = onEmailChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(stringResource(R.string.sign_in_email_label)) },
        placeholder = { Text(stringResource(R.string.sign_in_email_placeholder)) },
        singleLine = true,
        // Locked once a code is on its way: editing the address it was sent to
        // would leave the field disagreeing with what the API is expecting.
        enabled = !awaitingCode && !state.isBusy,
        keyboardOptions =
          KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
      )

      if (awaitingCode) {
        OutlinedTextField(
          value = state.code,
          onValueChange = onCodeChange,
          modifier = Modifier.fillMaxWidth().focusRequester(codeFocus),
          label = { Text(stringResource(R.string.sign_in_code_label)) },
          placeholder = { Text(stringResource(R.string.sign_in_code_placeholder)) },
          singleLine = true,
          enabled = !state.isBusy,
          keyboardOptions =
            KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
        )
      }

      state.error?.let { error ->
        Text(
          text = stringResource(error.messageRes),
          // A live region so TalkBack announces the failure as it appears,
          // instead of leaving it to be discovered by swiping.
          modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
          style = MaterialTheme.typography.bodySmall,
          color = MaterialTheme.colorScheme.error,
        )
      }

      PrimaryButton(
        onClick = {
          keyboard?.hide()
          onSubmit()
        },
        enabled = if (awaitingCode) state.canVerifyCode else state.canSendCode,
        busy = state.isBusy,
      ) {
        Text(
          stringResource(if (awaitingCode) R.string.sign_in_verify else R.string.sign_in_send_code)
        )
      }

      if (awaitingCode) {
        TextButton(
          onClick = onEditEmail,
          enabled = !state.isBusy,
          modifier = Modifier.align(Alignment.Start),
        ) {
          Text(stringResource(R.string.sign_in_change_email))
        }
      }
    }
  }
}

/** The launch state, held only as long as the session check takes. */
@Composable
fun RestoringScreen(modifier: Modifier = Modifier) {
  ScreenScaffold(modifier = modifier) { contentModifier ->
    Column(
      modifier = contentModifier.padding(24.dp),
      verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
      horizontalAlignment = Alignment.CenterHorizontally,
    ) {
      CircularProgressIndicator()
      Text(
        text = stringResource(R.string.session_restoring),
        modifier = Modifier.widthIn(max = 320.dp),
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
      )
    }
  }
}

/**
 * The copy for a failure.
 *
 * Here rather than on [AuthenticationError] so that type stays free of Android and testable without
 * a device — the same split as `messageKey` in `apps/ios`.
 */
private val AuthenticationError.messageRes: Int
  get() =
    when (this) {
      AuthenticationError.NotConfigured -> R.string.auth_error_not_configured
      AuthenticationError.Network -> R.string.auth_error_network
      AuthenticationError.InvalidCode -> R.string.auth_error_invalid_code
      AuthenticationError.ExpiredCode -> R.string.auth_error_expired_code
      AuthenticationError.TooManyAttempts -> R.string.auth_error_too_many_attempts
      AuthenticationError.Unavailable -> R.string.auth_error_unavailable
    }

@Preview(name = "Email", showBackground = true)
@Composable
private fun SignInEmailPreview() {
  LinOnwardTheme {
    SignInScreen(
      state = AuthenticationState().signedOut().withEmail("ada@example.com"),
      onEmailChange = {},
      onCodeChange = {},
      onSubmit = {},
      onEditEmail = {},
    )
  }
}

@Preview(name = "Code", showBackground = true)
@Composable
private fun SignInCodePreview() {
  LinOnwardTheme {
    SignInScreen(
      state = AuthenticationState().signedOut().withEmail("ada@example.com").codeSent(),
      onEmailChange = {},
      onCodeChange = {},
      onSubmit = {},
      onEditEmail = {},
    )
  }
}

@Preview(name = "Wrong code", showBackground = true)
@Composable
private fun SignInErrorPreview() {
  LinOnwardTheme {
    SignInScreen(
      state =
        AuthenticationState()
          .signedOut()
          .withEmail("ada@example.com")
          .codeSent()
          .withCode("123456")
          .failed(AuthenticationError.InvalidCode),
      onEmailChange = {},
      onCodeChange = {},
      onSubmit = {},
      onEditEmail = {},
    )
  }
}
