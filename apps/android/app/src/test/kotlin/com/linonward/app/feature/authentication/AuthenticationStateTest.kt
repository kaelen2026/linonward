package com.linonward.app.feature.authentication

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthenticationStateTest {
  private val ada = AuthenticatedUser(id = "user_1", email = "ada@example.com", name = "Ada")

  @Test
  fun `starts by restoring rather than by asking for an email`() {
    assertEquals(AuthenticationState.Step.Restoring, AuthenticationState().step)
  }

  @Test
  fun `refuses an address with nothing before the at sign`() {
    val state = AuthenticationState().signedOut().withEmail("@example.com")

    assertFalse(state.canSendCode)
  }

  @Test
  fun `refuses an address whose domain carries no dot`() {
    val state = AuthenticationState().signedOut().withEmail("ada@example")

    assertFalse(state.canSendCode)
  }

  @Test
  fun `accepts an address a keyboard padded with whitespace`() {
    val state = AuthenticationState().signedOut().withEmail("  ada@example.com\n")

    assertTrue(state.canSendCode)
    assertEquals("ada@example.com", state.trimmedEmail)
  }

  @Test
  fun `refuses a second submission while one is in flight`() {
    val state = AuthenticationState().signedOut().withEmail("ada@example.com").beginRequest()

    assertFalse(state.canSendCode)
  }

  @Test
  fun `keeps only the digits of a pasted code, up to the length the API expects`() {
    val state = AuthenticationState().withCode(" 12-34 5678")

    assertEquals("123456", state.code)
  }

  @Test
  fun `verifies only a full-length code`() {
    val short = AuthenticationState().signedOut().withCode("12345")
    val full = AuthenticationState().signedOut().withCode("123456")

    assertFalse(short.canVerifyCode)
    assertTrue(full.canVerifyCode)
  }

  @Test
  fun `sending a code carries the trimmed address on to the code step`() {
    val state =
      AuthenticationState().signedOut().withEmail(" ada@example.com ").beginRequest().codeSent()

    assertEquals(AuthenticationState.Step.Code, state.step)
    assertEquals("ada@example.com", state.email)
    assertFalse(state.isBusy)
  }

  @Test
  fun `a wrong code leaves the person on the code step to retype it`() {
    val state = awaitingCode().withCode("123456").failed(AuthenticationError.InvalidCode)

    assertEquals(AuthenticationState.Step.Code, state.step)
    assertEquals("123456", state.code)
    assertEquals(AuthenticationError.InvalidCode, state.error)
  }

  @Test
  fun `an expired code sends the person back to request a new one`() {
    val state = awaitingCode().withCode("123456").failed(AuthenticationError.ExpiredCode)

    assertEquals(AuthenticationState.Step.Email, state.step)
    assertEquals("", state.code)
    assertEquals(AuthenticationError.ExpiredCode, state.error)
  }

  @Test
  fun `burning every attempt sends the person back to request a new one`() {
    val state = awaitingCode().withCode("123456").failed(AuthenticationError.TooManyAttempts)

    assertEquals(AuthenticationState.Step.Email, state.step)
    assertEquals("", state.code)
  }

  @Test
  fun `signing in clears the code and the last failure`() {
    val state =
      awaitingCode().withCode("123456").failed(AuthenticationError.InvalidCode).signedIn(ada)

    assertEquals(AuthenticationState.Step.SignedIn(ada), state.step)
    assertEquals("", state.code)
    assertNull(state.error)
    assertFalse(state.isBusy)
  }

  @Test
  fun `signing out keeps the address so a new code is one tap away`() {
    val state = awaitingCode().withCode("123456").signedIn(ada).signedOut()

    assertEquals(AuthenticationState.Step.Email, state.step)
    assertEquals("ada@example.com", state.email)
    assertEquals("", state.code)
    assertNull(state.error)
  }

  @Test
  fun `changing the address is a step back, not a failure`() {
    val state = awaitingCode().failed(AuthenticationError.InvalidCode).editEmail()

    assertEquals(AuthenticationState.Step.Email, state.step)
    assertNull(state.error)
  }

  private fun awaitingCode() =
    AuthenticationState().signedOut().withEmail("ada@example.com").beginRequest().codeSent()
}
