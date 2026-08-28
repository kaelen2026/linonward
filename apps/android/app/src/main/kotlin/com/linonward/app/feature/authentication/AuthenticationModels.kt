package com.linonward.app.feature.authentication

/**
 * The signed-in person, as the API reports them.
 *
 * Only the fields the app actually renders are kept. Better Auth returns a wider user record, and
 * pulling all of it in would turn every backend field addition into an Android decoding concern.
 */
data class AuthenticatedUser(val id: String, val email: String, val name: String)

/** A completed sign-in: who signed in, and the token that proves it next time. */
data class AuthenticatedSession(val user: AuthenticatedUser, val token: String)
