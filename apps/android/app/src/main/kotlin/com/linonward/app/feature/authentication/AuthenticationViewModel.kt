package com.linonward.app.feature.authentication

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.linonward.app.BuildConfig
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Drives the sign-in flow: owns the state, calls the service, and decides what happens to the
 * stored token.
 *
 * Thin on purpose. Every rule about which screen comes next lives in [AuthenticationState], which is
 * testable without a device; what is left here is the wiring between that value, the network, and
 * the keystore.
 *
 * @param service `null` when the build carries no API origin. Every action then reports
 *   [AuthenticationError.NotConfigured] rather than failing silently or crashing on launch.
 */
class AuthenticationViewModel(
  private val service: AuthenticationService?,
  private val tokens: SessionTokenStore,
) : ViewModel() {
  private val _state = MutableStateFlow(AuthenticationState())
  val state: StateFlow<AuthenticationState> = _state.asStateFlow()

  fun onEmailChange(value: String) = _state.update { it.withEmail(value) }

  fun onCodeChange(value: String) = _state.update { it.withCode(value) }

  fun editEmail() = _state.update { it.editEmail() }

  /** Turns a stored token back into a session, once per launch. */
  fun restore() {
    val service =
      service
        ?: run {
          // Order matters: `signedOut` clears the error, so the reason has to be
          // set after the step, not before it.
          _state.update { it.signedOut().failed(AuthenticationError.NotConfigured) }
          return
        }
    val token =
      tokens.read()
        ?: run {
          _state.update { it.signedOut() }
          return
        }

    viewModelScope.launch {
      when (val result = service.currentUser(token)) {
        is AuthenticationResult.Success ->
          if (result.value != null) {
            _state.update { it.signedIn(result.value) }
          } else {
            // The API is the authority and it says this token is spent.
            tokens.clear()
            _state.update { it.signedOut() }
          }
        // Being offline is not being signed out. The token stays put so the next
        // launch on a working network restores the session instead of demanding
        // a new code.
        is AuthenticationResult.Failure -> _state.update { it.signedOut().failed(result.error) }
      }
    }
  }

  fun sendVerificationCode() {
    val service = service ?: return failWithoutService()
    val current = _state.value
    if (current.step != AuthenticationState.Step.Email || !current.canSendCode) return
    val email = current.trimmedEmail
    _state.update { it.beginRequest() }

    viewModelScope.launch {
      val failure = service.sendVerificationCode(email)
      _state.update { if (failure != null) it.failed(failure) else it.codeSent() }
    }
  }

  fun verifyCode() {
    val service = service ?: return failWithoutService()
    val current = _state.value
    if (current.step != AuthenticationState.Step.Code || !current.canVerifyCode) return
    _state.update { it.beginRequest() }

    viewModelScope.launch {
      when (val result = service.signIn(email = current.email, code = current.code)) {
        is AuthenticationResult.Success -> {
          if (tokens.write(result.value.token)) {
            _state.update { it.signedIn(result.value.user) }
          } else {
            _state.update { it.failed(AuthenticationError.Storage) }
          }
        }
        is AuthenticationResult.Failure -> _state.update { it.failed(result.error) }
      }
    }
  }

  /**
   * Signs out locally first, then tells the API.
   *
   * The order matters: nobody should stay signed in on a screen because the network is slow, and a
   * revocation that fails leaves a token the app has already forgotten — it expires on its own.
   */
  fun signOut() {
    val token = tokens.read()
    tokens.clear()
    _state.update { it.signedOut() }

    if (service != null && token != null) {
      viewModelScope.launch { service.signOut(token) }
    }
  }

  private fun failWithoutService() {
    _state.update { it.failed(AuthenticationError.NotConfigured) }
  }

  companion object {
    val Factory: ViewModelProvider.Factory = viewModelFactory {
      initializer {
        val application = checkNotNull(this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY])
        // The one origin this build talks to, baked in at build time — see
        // `app/build.gradle.kts`. A release that was never configured gets a
        // null factory here and says so on the sign-in screen.
        val requests = AuthenticationRequestFactory.of(BuildConfig.API_BASE_URL)
        AuthenticationViewModel(
          service = requests?.let(::HttpAuthenticationService),
          tokens = KeystoreSessionTokenStore(application),
        )
      }
    }
  }
}
