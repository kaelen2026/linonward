package com.linonward.app.feature.authentication

import android.util.Log
import java.net.HttpURLConnection
import java.net.URI
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * The calls the app makes against the auth API.
 *
 * Failures come back as values rather than thrown exceptions: every one of them is something the
 * sign-in screen renders, and none is exceptional.
 */
interface AuthenticationService {
  /** `null` when the API accepted the request. */
  suspend fun sendVerificationCode(email: String): AuthenticationError?

  suspend fun signIn(email: String, code: String): AuthenticationResult<AuthenticatedSession>

  /** A `null` value inside a success means the token is no longer good for a session. */
  suspend fun currentUser(token: String): AuthenticationResult<AuthenticatedUser?>

  /** `null` when the session was revoked server-side. */
  suspend fun signOut(token: String): AuthenticationError?
}

/**
 * The one place a socket is opened.
 *
 * `HttpURLConnection` rather than a client library: the app makes five calls, all of them JSON over
 * HTTP, and the request and response shapes are already values that
 * [AuthenticationRequestFactory] and [AuthenticationResponseDecoder] own and test.
 *
 * The app installs no [java.net.CookieHandler], and must not. Better Auth runs its CSRF origin
 * check only on requests carrying a `Cookie` header, and a native client sends no `Origin` for it
 * to accept — so the moment a session cookie were stored and replayed, every later call would come
 * back 403. The bearer token is the app's credential; the `Set-Cookie` sign-in answers with is
 * dropped on the floor.
 */
class HttpAuthenticationService(
  private val requests: AuthenticationRequestFactory,
  private val dispatcher: CoroutineDispatcher = Dispatchers.IO,
) : AuthenticationService {
  private val responses = AuthenticationResponseDecoder()

  override suspend fun sendVerificationCode(email: String): AuthenticationError? {
    val reply = send(requests.sendVerificationCode(email)) ?: return AuthenticationError.Network
    return responses.acknowledgement(reply.status, reply.body)
  }

  override suspend fun signIn(
    email: String,
    code: String,
  ): AuthenticationResult<AuthenticatedSession> {
    val reply =
      send(requests.signIn(email, code))
        ?: return AuthenticationResult.Failure(AuthenticationError.Network)
    return responses.signIn(reply.status, reply.authToken, reply.body)
  }

  override suspend fun currentUser(token: String): AuthenticationResult<AuthenticatedUser?> {
    val reply =
      send(requests.session(token))
        ?: return AuthenticationResult.Failure(AuthenticationError.Network)
    return responses.session(reply.status, reply.body)
  }

  override suspend fun signOut(token: String): AuthenticationError? {
    val reply = send(requests.signOut(token)) ?: return AuthenticationError.Network
    return responses.acknowledgement(reply.status, reply.body)
  }

  /**
   * `null` for anything that never produced an HTTP reply — no connection, a DNS failure, a TLS
   * refusal — all of which read to a person as "the network did not work".
   */
  private suspend fun send(request: AuthenticationRequest): AuthenticationReply? =
    withContext(dispatcher) {
      runCatching {
          val connection = URI(request.url).toURL().openConnection() as HttpURLConnection
          try {
            connection.requestMethod = request.method
            connection.connectTimeout = TIMEOUT_MILLIS
            connection.readTimeout = TIMEOUT_MILLIS
            connection.useCaches = false
            // A redirect on an authenticated POST would be replayed as a GET
            // without the body; there is nothing legitimate for this API to
            // redirect to.
            connection.instanceFollowRedirects = false
            for ((field, value) in request.headers) {
              connection.setRequestProperty(field, value)
            }
            if (request.body != null) {
              connection.doOutput = true
              connection.outputStream.use { it.write(request.body.toByteArray()) }
            }

            val status = connection.responseCode
            // `inputStream` throws on a 4xx; the body an error carries — which
            // is where Better Auth puts its error code — arrives on
            // `errorStream` instead.
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            AuthenticationReply(
              status = status,
              authToken = connection.getHeaderField("set-auth-token"),
              body = body,
            )
          } finally {
            connection.disconnect()
          }
        }
        .onFailure { failure ->
          // Do not log URLs, bodies, headers, or exception messages: all can
          // carry credentials or personal data. The failure type is enough to
          // distinguish transport, TLS, and decoding classes in diagnostics.
          Log.w(LOG_TAG, "Request failed (${failure::class.java.simpleName})")
        }
        .getOrNull()
    }

  private companion object {
    const val TIMEOUT_MILLIS = 15_000
    const val LOG_TAG = "LinOnwardAuth"
  }
}

/** One HTTP reply, reduced to the three things any caller here reads. */
private data class AuthenticationReply(val status: Int, val authToken: String?, val body: String)
