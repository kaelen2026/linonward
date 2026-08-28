package com.linonward.app.feature.authentication

/**
 * The sign-in flow's state and every legal transition through it.
 *
 * Deliberately free of Compose, Android and HTTP: this is the part of authentication that is easy
 * to get wrong — a code field left populated after a failure, a spinner that never stops, a person
 * stranded on a code screen after burning their attempts — and keeping it a plain value is what
 * makes all of it testable without a device.
 *
 * Every transition returns a new state rather than mutating one, so the composable that renders it
 * recomposes on identity rather than on a change it has to be told about.
 */
data class AuthenticationState(
  val email: String = "",
  val code: String = "",
  val step: Step = Step.Restoring,
  val isBusy: Boolean = false,
  val error: AuthenticationError? = null,
) {
  /** Which screen the person is looking at. */
  sealed interface Step {
    /**
     * Checking a stored token before showing anything. The launch state, so a returning person
     * never sees the sign-in form flash past.
     */
    data object Restoring : Step

    /** Asking for an email address. */
    data object Email : Step

    /** Asking for the code just sent to [AuthenticationState.email]. */
    data object Code : Step

    /** Done. */
    data class SignedIn(val user: AuthenticatedUser) : Step
  }

  /** The address to actually send, with the whitespace a keyboard likes to append removed. */
  val trimmedEmail: String
    get() = email.trim()

  /**
   * Enough of an address to be worth a round trip. The API is the authority on whether it is
   * deliverable; this only stops an obviously empty submission.
   */
  val canSendCode: Boolean
    get() {
      if (isBusy) return false
      val parts = trimmedEmail.split("@")
      return parts.size == 2 && parts[0].isNotEmpty() && parts[1].contains(".")
    }

  val canVerifyCode: Boolean
    get() = !isBusy && code.length == VERIFICATION_CODE_LENGTH

  fun withEmail(value: String) = copy(email = value)

  /**
   * Keeps only the digits, up to the length the API issues.
   *
   * A numeric keyboard is a hint, not a constraint — a paste, an autofill, or a hardware keyboard
   * all get past it — and a code with a stray space in it fails against the API for a reason
   * nothing on screen explains.
   */
  fun withCode(value: String) =
    copy(code = value.filter { it.isDigit() }.take(VERIFICATION_CODE_LENGTH))

  fun beginRequest() = copy(isBusy = true, error = null)

  /**
   * A request came back unhappy.
   *
   * A code that expired or ran out of attempts cannot be rescued by retyping it, so those send the
   * person back to request a new one rather than leaving them poking at a dead code.
   */
  fun failed(error: AuthenticationError) =
    if (error.requiresNewCode) {
      copy(isBusy = false, error = error, code = "", step = Step.Email)
    } else {
      copy(isBusy = false, error = error)
    }

  fun codeSent() =
    copy(isBusy = false, error = null, email = trimmedEmail, code = "", step = Step.Code)

  fun signedIn(user: AuthenticatedUser) =
    copy(isBusy = false, error = null, code = "", step = Step.SignedIn(user))

  /**
   * No session, by any route: nothing stored at launch, a rejected token, or signing out. Clears
   * the code but keeps the address, so somebody who just signed out is one tap from a new code.
   */
  fun signedOut() = copy(isBusy = false, error = null, code = "", step = Step.Email)

  /** "Use a different address" — an explicit step back, not a failure. */
  fun editEmail() = copy(error = null, code = "", step = Step.Email)

  companion object {
    /** Matches Better Auth's default OTP length. */
    const val VERIFICATION_CODE_LENGTH = 6
  }
}
