package com.linonward.app.feature.authentication

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AuthenticationViewModelTest {
  private val ada = AuthenticatedUser(id = "user_1", email = "ada@example.com", name = "Ada")

  @Before
  fun useTestDispatcher() {
    // `viewModelScope` runs on Dispatchers.Main, which has no implementation on
    // the JVM until one is installed.
    Dispatchers.setMain(UnconfinedTestDispatcher())
  }

  @After
  fun releaseTestDispatcher() {
    Dispatchers.resetMain()
  }

  @Test
  fun `a launch with nothing stored asks for an email`() = runTest {
    val viewModel = viewModel(tokens = InMemoryTokenStore())

    viewModel.restore()

    assertEquals(AuthenticationState.Step.Email, viewModel.state.value.step)
  }

  @Test
  fun `a launch with a token the API still honours restores the session`() = runTest {
    val viewModel =
      viewModel(
        service = FakeAuthenticationService(currentUser = AuthenticationResult.Success(ada)),
        tokens = InMemoryTokenStore("stored-token"),
      )

    viewModel.restore()

    assertEquals(AuthenticationState.Step.SignedIn(ada), viewModel.state.value.step)
  }

  @Test
  fun `a token the API has spent is forgotten`() = runTest {
    val tokens = InMemoryTokenStore("stored-token")
    val viewModel =
      viewModel(
        service = FakeAuthenticationService(currentUser = AuthenticationResult.Success(null)),
        tokens = tokens,
      )

    viewModel.restore()

    assertNull(tokens.read())
    assertEquals(AuthenticationState.Step.Email, viewModel.state.value.step)
  }

  @Test
  fun `being offline at launch is not being signed out`() = runTest {
    val tokens = InMemoryTokenStore("stored-token")
    val viewModel =
      viewModel(
        service =
          FakeAuthenticationService(
            currentUser = AuthenticationResult.Failure(AuthenticationError.Network)
          ),
        tokens = tokens,
      )

    viewModel.restore()

    assertEquals("stored-token", tokens.read())
    assertEquals(AuthenticationError.Network, viewModel.state.value.error)
  }

  @Test
  fun `a build with no API origin says so instead of failing silently`() = runTest {
    val viewModel = viewModel(service = null, tokens = InMemoryTokenStore())

    viewModel.restore()

    assertEquals(AuthenticationError.NotConfigured, viewModel.state.value.error)
    assertEquals(AuthenticationState.Step.Email, viewModel.state.value.step)
  }

  @Test
  fun `verifying a code stores the token it comes back with`() = runTest {
    val tokens = InMemoryTokenStore()
    val service =
      FakeAuthenticationService(
        signIn =
          AuthenticationResult.Success(AuthenticatedSession(user = ada, token = "fresh-token"))
      )
    val viewModel = viewModel(service = service, tokens = tokens)
    viewModel.restore()
    viewModel.onEmailChange("ada@example.com")
    viewModel.sendVerificationCode()
    viewModel.onCodeChange("123456")

    viewModel.verifyCode()

    assertEquals("fresh-token", tokens.read())
    assertEquals(AuthenticationState.Step.SignedIn(ada), viewModel.state.value.step)
  }

  @Test
  fun `signing out forgets the token even before the API is told`() = runTest {
    val tokens = InMemoryTokenStore("stored-token")
    val service = FakeAuthenticationService(signOut = AuthenticationError.Network)
    val viewModel = viewModel(service = service, tokens = tokens)

    viewModel.signOut()

    assertNull(tokens.read())
    assertEquals(AuthenticationState.Step.Email, viewModel.state.value.step)
    assertEquals(listOf("stored-token"), service.revokedTokens)
  }

  private fun viewModel(
    service: AuthenticationService? = FakeAuthenticationService(),
    tokens: SessionTokenStore,
  ) = AuthenticationViewModel(service = service, tokens = tokens)
}

private class InMemoryTokenStore(private var token: String? = null) : SessionTokenStore {
  override fun read() = token

  override fun write(token: String) {
    this.token = token
  }

  override fun clear() {
    token = null
  }
}

private class FakeAuthenticationService(
  private val sendVerificationCode: AuthenticationError? = null,
  private val signIn: AuthenticationResult<AuthenticatedSession> =
    AuthenticationResult.Failure(AuthenticationError.Unavailable),
  private val currentUser: AuthenticationResult<AuthenticatedUser?> =
    AuthenticationResult.Success(null),
  private val signOut: AuthenticationError? = null,
) : AuthenticationService {
  val revokedTokens = mutableListOf<String>()

  override suspend fun sendVerificationCode(email: String) = sendVerificationCode

  override suspend fun signIn(email: String, code: String) = signIn

  override suspend fun currentUser(token: String) = currentUser

  override suspend fun signOut(token: String): AuthenticationError? {
    revokedTokens += token
    return signOut
  }
}
