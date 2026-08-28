package com.linonward.app.feature.authentication

import java.net.URI
import kotlinx.serialization.json.Json

/**
 * One call to the auth API, described without reference to any HTTP client.
 *
 * Keeping this a plain value is what lets the request shape be asserted in a test without a network
 * stack, and keeps every connection detail at a single edge in [HttpAuthenticationService].
 */
data class AuthenticationRequest(
  val url: String,
  val method: String,
  val headers: Map<String, String>,
  val body: String?,
)

/** Builds the requests the app makes against Better Auth, mounted by `apps/api` under `/api/auth`. */
class AuthenticationRequestFactory private constructor(private val baseUrl: String) {

  fun sendVerificationCode(email: String): AuthenticationRequest =
    post("email-otp/send-verification-otp", mapOf("email" to email, "type" to "sign-in"))

  fun signIn(email: String, code: String): AuthenticationRequest =
    post("sign-in/email-otp", mapOf("email" to email, "otp" to code))

  fun session(token: String): AuthenticationRequest =
    AuthenticationRequest(
      url = url("get-session"),
      method = "GET",
      headers = mapOf("Accept" to "application/json", "Authorization" to "Bearer $token"),
      body = null,
    )

  fun signOut(token: String): AuthenticationRequest = post("sign-out", emptyMap(), token = token)

  private fun post(
    path: String,
    body: Map<String, String>,
    token: String? = null,
  ): AuthenticationRequest {
    val headers = buildMap {
      put("Accept", "application/json")
      put("Content-Type", "application/json")
      if (token != null) put("Authorization", "Bearer $token")
    }
    return AuthenticationRequest(
      url = url(path),
      method = "POST",
      headers = headers,
      body = Json.encodeToString(body),
    )
  }

  /**
   * Joins a path onto the origin with exactly one slash between them.
   *
   * String concatenation rather than [URI.resolve], for the same reason `apps/web` avoids
   * `new URL(path, base)`: resolution treats the path as absolute and discards any base path, so an
   * API deployed under `https://example.com/gateway` would lose the `/gateway`.
   */
  private fun url(path: String) = "$baseUrl/api/auth/$path"

  companion object {
    /**
     * `null` when the build supplied no usable origin, which is what a release ships by default —
     * see `app/build.gradle.kts`. Rejecting it here means a misconfigured build fails visibly on
     * the sign-in screen rather than on somebody's first attempt.
     */
    fun of(baseUrl: String?): AuthenticationRequestFactory? {
      val trimmed = baseUrl?.trim().orEmpty()
      if (trimmed.isEmpty()) return null

      val uri = runCatching { URI(trimmed) }.getOrNull() ?: return null
      // Only the two schemes an Android app can actually open a connection on.
      // Anything else — `localhost:3001` parses as a scheme of its own — is a
      // configuration mistake worth surfacing rather than guessing at.
      if (uri.scheme !in setOf("http", "https") || uri.host.isNullOrEmpty()) return null

      return AuthenticationRequestFactory(trimmed.trimEnd('/'))
    }
  }
}
