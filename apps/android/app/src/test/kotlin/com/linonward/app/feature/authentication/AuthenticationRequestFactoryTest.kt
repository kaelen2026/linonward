package com.linonward.app.feature.authentication

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthenticationRequestFactoryTest {
  @Test
  fun `a build with no origin gets no factory`() {
    assertNull(AuthenticationRequestFactory.of(""))
    assertNull(AuthenticationRequestFactory.of("   "))
    assertNull(AuthenticationRequestFactory.of(null))
  }

  @Test
  fun `an origin without a scheme is refused rather than guessed at`() {
    assertNull(AuthenticationRequestFactory.of("localhost:3001"))
    assertNull(AuthenticationRequestFactory.of("ftp://example.com"))
  }

  @Test
  fun `builds the send-verification-code call under the auth mount`() {
    val request = factory().sendVerificationCode("ada@example.com")

    assertEquals("http://10.0.2.2:3001/api/auth/email-otp/send-verification-otp", request.url)
    assertEquals("POST", request.method)
    assertEquals("application/json", request.headers["Content-Type"])
    val body = request.body.orEmpty()
    assertTrue(body.contains("\"email\":\"ada@example.com\""))
    assertTrue(body.contains("\"type\":\"sign-in\""))
  }

  @Test
  fun `keeps a path prefix an API is deployed under`() {
    val request = AuthenticationRequestFactory.of("https://example.com/gateway")!!.signOut("tok")

    assertEquals("https://example.com/gateway/api/auth/sign-out", request.url)
  }

  @Test
  fun `tolerates a trailing slash on the configured origin`() {
    val request = AuthenticationRequestFactory.of("https://example.com/")!!.signOut("tok")

    assertEquals("https://example.com/api/auth/sign-out", request.url)
  }

  @Test
  fun `signs in with the address and the code`() {
    val request = factory().signIn(email = "ada@example.com", code = "123456")

    assertEquals("http://10.0.2.2:3001/api/auth/sign-in/email-otp", request.url)
    assertTrue(request.body.orEmpty().contains("\"otp\":\"123456\""))
  }

  @Test
  fun `reads the session with a bearer token and no body`() {
    val request = factory().session("session-token")

    assertEquals("http://10.0.2.2:3001/api/auth/get-session", request.url)
    assertEquals("GET", request.method)
    assertEquals("Bearer session-token", request.headers["Authorization"])
    assertNull(request.body)
  }

  @Test
  fun `signs out with the token being revoked`() {
    val request = factory().signOut("session-token")

    assertEquals("POST", request.method)
    assertEquals("Bearer session-token", request.headers["Authorization"])
    assertNotNull(request.body)
  }

  private fun factory() = AuthenticationRequestFactory.of("http://10.0.2.2:3001")!!
}
