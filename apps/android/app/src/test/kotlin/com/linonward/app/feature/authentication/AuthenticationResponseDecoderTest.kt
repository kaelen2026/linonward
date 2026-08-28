package com.linonward.app.feature.authentication

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AuthenticationResponseDecoderTest {
  private val decoder = AuthenticationResponseDecoder()
  private val signInBody =
    """{"token":"body-token","user":{"id":"user_1","email":"ada@example.com","name":"Ada"}}"""

  @Test
  fun `prefers the signed token from the header over the raw one in the body`() {
    val result = decoder.signIn(status = 200, authToken = "header-token", body = signInBody)

    assertEquals("header-token", result.session().token)
    assertEquals("Ada", result.session().user.name)
  }

  @Test
  fun `falls back to the body token when the header was stripped in transit`() {
    val result = decoder.signIn(status = 200, authToken = null, body = signInBody)

    assertEquals("body-token", result.session().token)
  }

  @Test
  fun `a success carrying no token at all is a failure, not a session`() {
    val body = """{"user":{"id":"user_1","email":"ada@example.com","name":"Ada"}}"""

    val result = decoder.signIn(status = 200, authToken = "   ", body = body)

    assertEquals(AuthenticationError.Unavailable, result.failure())
  }

  @Test
  fun `addresses somebody the API gave no name by their email`() {
    val body = """{"token":"t","user":{"id":"user_1","email":"ada@example.com","name":""}}"""

    val result = decoder.signIn(status = 200, authToken = null, body = body)

    assertEquals("ada@example.com", result.session().user.name)
  }

  @Test
  fun `a wrong code is reported as a wrong code`() {
    val result = decoder.signIn(status = 400, authToken = null, body = """{"code":"INVALID_OTP"}""")

    assertEquals(AuthenticationError.InvalidCode, result.failure())
  }

  @Test
  fun `an expired code is reported as expired`() {
    val result = decoder.signIn(status = 400, authToken = null, body = """{"code":"OTP_EXPIRED"}""")

    assertEquals(AuthenticationError.ExpiredCode, result.failure())
  }

  @Test
  fun `a rate limit with no plugin code still reads as too many attempts`() {
    val result = decoder.signIn(status = 429, authToken = null, body = "")

    assertEquals(AuthenticationError.TooManyAttempts, result.failure())
  }

  @Test
  fun `a success carrying junk is a failure rather than a crash`() {
    val result = decoder.signIn(status = 200, authToken = "token", body = "<html>nope</html>")

    assertEquals(AuthenticationError.Unavailable, result.failure())
  }

  @Test
  fun `a null session means signed out, not broken`() {
    val result = decoder.session(status = 200, body = "null")

    assertNull((result as AuthenticationResult.Success).value)
  }

  @Test
  fun `an empty session body means signed out too`() {
    val result = decoder.session(status = 200, body = "  ")

    assertNull((result as AuthenticationResult.Success).value)
  }

  @Test
  fun `reads the signed-in person out of a session`() {
    val body = """{"session":{"id":"s_1"},"user":{"id":"user_1","email":"ada@example.com"}}"""

    val result = decoder.session(status = 200, body = body)

    assertEquals("user_1", (result as AuthenticationResult.Success).value?.id)
  }

  @Test
  fun `an acknowledged call reports no failure`() {
    assertNull(decoder.acknowledgement(status = 204, body = ""))
  }

  @Test
  fun `a refused call reports one`() {
    assertEquals(AuthenticationError.Unavailable, decoder.acknowledgement(status = 500, body = ""))
  }

  private fun AuthenticationResult<AuthenticatedSession>.session() =
    (this as AuthenticationResult.Success).value

  private fun AuthenticationResult<*>.failure() = (this as AuthenticationResult.Failure).error
}
