package com.linonward.app.app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.linonward.app.feature.authentication.AuthenticationState
import com.linonward.app.feature.authentication.AuthenticationViewModel
import com.linonward.app.feature.authentication.RestoringScreen
import com.linonward.app.feature.authentication.SignInScreen
import com.linonward.app.feature.home.HomeScreen
import com.linonward.app.feature.articlereader.ArticleReaderScreen

/**
 * The root composition: which of the three screens the flow's state calls for.
 *
 * Deliberately no navigation library and no router. The app has one axis — signed in or not — and
 * that axis is already a value in [AuthenticationState]. A back stack should appear with the first
 * destination that needs one, not before.
 */
@Composable
fun LinOnwardApp(
  viewModel: AuthenticationViewModel = viewModel(factory = AuthenticationViewModel.Factory)
) {
  val state by viewModel.state.collectAsStateWithLifecycle()
  var readerOpen by rememberSaveable { mutableStateOf(false) }

  // Once per launch: turns a stored token back into a session before the
  // sign-in form would otherwise appear. Keyed on Unit rather than on the step,
  // so a sign-out does not immediately restore what it just cleared.
  LaunchedEffect(Unit) { viewModel.restore() }

  when (val step = state.step) {
    AuthenticationState.Step.Restoring -> RestoringScreen()
    AuthenticationState.Step.Email,
    AuthenticationState.Step.Code ->
      SignInScreen(
        state = state,
        onEmailChange = viewModel::onEmailChange,
        onCodeChange = viewModel::onCodeChange,
        onSubmit = {
          if (step == AuthenticationState.Step.Code) {
            viewModel.verifyCode()
          } else {
            viewModel.sendVerificationCode()
          }
        },
        onEditEmail = viewModel::editEmail,
      )
    is AuthenticationState.Step.SignedIn -> if (readerOpen) {
      ArticleReaderScreen(onClose = { readerOpen = false }, modifier = Modifier.fillMaxSize())
    } else {
      HomeScreen(
        user = step.user,
        onOpenReader = { readerOpen = true },
        onSignOut = viewModel::signOut,
      )
    }
  }
}
