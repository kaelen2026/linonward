package com.linonward.app.feature.authentication

/**
 * Everything the sign-in screen can put in front of somebody.
 *
 * The cases are the ones a person can act on differently — retype the code, ask for a new one,
 * wait, check the network. Failures with the same remedy collapse into [Unavailable] rather than
 * leaking a backend string that is English-only and written for an operator.
 *
 * Deliberately carries no string resource id: this type is tested without a device, and mapping a
 * case to copy belongs to the composable that renders it.
 */
enum class AuthenticationError {
  /** No API origin is configured in the build, so no request can be made. */
  NotConfigured,

  /** The request never reached the API, or the reply was unreadable. */
  Network,

  /** The session credential could not be persisted securely on this device. */
  Storage,

  /** The code was wrong. */
  InvalidCode,

  /** The code was right once, but it has aged out. */
  ExpiredCode,

  /** Too many wrong codes; this one needs a fresh send. */
  TooManyAttempts,

  /** The API answered, but not with anything the app can use. */
  Unavailable;

  /**
   * Whether the person should be sent back to the email step instead of being invited to retype a
   * code that can no longer succeed.
   */
  val requiresNewCode: Boolean
    get() = this == ExpiredCode || this == TooManyAttempts

  internal companion object {
    /**
     * Maps a Better Auth error reply onto a case.
     *
     * The `code` is the contract worth reading: `message` is prose that changes between releases,
     * while the codes come from the email-OTP plugin's published `EMAIL_OTP_ERROR_CODES`.
     */
    fun from(status: Int, code: String?): AuthenticationError =
      when (code) {
        "INVALID_OTP" -> InvalidCode
        "OTP_EXPIRED" -> ExpiredCode
        "TOO_MANY_ATTEMPTS" -> TooManyAttempts
        // 429 has no plugin code — it is the API's own rate limiter — and reads
        // to a person exactly like having burned their attempts.
        else -> if (status == 429) TooManyAttempts else Unavailable
      }
  }
}

/**
 * The result of a call that can fail in a way the sign-in screen renders.
 *
 * Not [kotlin.Result]: none of these failures is exceptional, and forcing them through a
 * [Throwable] would invite a `try`/`catch` around code that never throws.
 */
sealed interface AuthenticationResult<out T> {
  data class Success<out T>(val value: T) : AuthenticationResult<T>

  data class Failure(val error: AuthenticationError) : AuthenticationResult<Nothing>
}
