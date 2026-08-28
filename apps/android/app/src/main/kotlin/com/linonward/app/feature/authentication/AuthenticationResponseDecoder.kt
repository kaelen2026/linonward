package com.linonward.app.feature.authentication

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Turns an auth API reply into a result, with no network stack involved.
 *
 * Every response the app receives crosses an untrusted boundary, so nothing here assumes a body is
 * present, well-formed, or shaped as documented — a 200 carrying junk is a failure, not a crash.
 */
class AuthenticationResponseDecoder {

  /**
   * `POST /sign-in/email-otp`.
   *
   * @param authToken the `set-auth-token` response header, which the bearer plugin adds. It carries
   *   the *signed* cookie value; the `token` in the body is the raw session token, which the plugin
   *   also accepts because it signs an unsigned token itself. The header is preferred, and the body
   *   is the fallback for a deployment where the header is stripped in transit.
   */
  fun signIn(
    status: Int,
    authToken: String?,
    body: String,
  ): AuthenticationResult<AuthenticatedSession> {
    failure(status, body)?.let {
      return AuthenticationResult.Failure(it)
    }

    val payload =
      runCatching { json.decodeFromString<SignInPayload>(body) }.getOrNull()
        ?: return AuthenticationResult.Failure(AuthenticationError.Unavailable)

    val token = authToken?.trim()?.ifEmpty { null } ?: payload.token?.trim()?.ifEmpty { null }
    return if (token == null) {
      AuthenticationResult.Failure(AuthenticationError.Unavailable)
    } else {
      AuthenticationResult.Success(AuthenticatedSession(payload.user.toUser(), token))
    }
  }

  /**
   * `GET /get-session`, which answers 200 with a literal `null` — not 401 — when the token is
   * missing, expired, or revoked. A `null` value therefore means signed out, and is not an error.
   */
  fun session(status: Int, body: String): AuthenticationResult<AuthenticatedUser?> {
    failure(status, body)?.let {
      return AuthenticationResult.Failure(it)
    }

    val trimmed = body.trim()
    if (trimmed.isEmpty() || trimmed == "null") return AuthenticationResult.Success(null)

    val payload =
      runCatching { json.decodeFromString<SessionPayload>(trimmed) }.getOrNull()
        ?: return AuthenticationResult.Failure(AuthenticationError.Unavailable)
    return AuthenticationResult.Success(payload.user.toUser())
  }

  /**
   * `POST /email-otp/send-verification-otp` and `POST /sign-out`, whose bodies carry nothing the app
   * needs. `null` means the API accepted the call.
   */
  fun acknowledgement(status: Int, body: String): AuthenticationError? = failure(status, body)

  /** `null` for any 2xx; the mapped error otherwise. */
  private fun failure(status: Int, body: String): AuthenticationError? {
    if (status in 200..299) return null
    val payload = runCatching { json.decodeFromString<FailurePayload>(body) }.getOrNull()
    return AuthenticationError.from(status, payload?.code)
  }

  private companion object {
    // Better Auth returns a wider record than the app reads, and it grows
    // between releases; a strict decoder would turn every backend addition into
    // a sign-in failure here.
    val json = Json { ignoreUnknownKeys = true }
  }
}

@Serializable
private data class UserPayload(val id: String, val email: String, val name: String? = null) {
  /**
   * Better Auth leaves `name` empty for an account created by email OTP, and omits it entirely on
   * some providers. Falling back to the email keeps the greeting addressed to somebody rather than
   * to an empty string.
   */
  fun toUser() =
    AuthenticatedUser(id = id, email = email, name = name?.ifEmpty { null } ?: email)
}

@Serializable private data class SignInPayload(val token: String? = null, val user: UserPayload)

@Serializable private data class SessionPayload(val user: UserPayload)

/**
 * Better Auth's error envelope. Both fields are optional because an error raised before the plugin
 * stack — a proxy, say — will not follow the shape.
 */
@Serializable
private data class FailurePayload(val code: String? = null, val message: String? = null)
