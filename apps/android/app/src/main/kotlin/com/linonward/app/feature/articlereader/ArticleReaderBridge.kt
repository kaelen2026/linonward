package com.linonward.app.feature.articlereader

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.util.UUID

internal sealed interface ArticleBridgeResult {
  data class Welcome(val sessionId: String, val message: String) : ArticleBridgeResult
  data object Accepted : ArticleBridgeResult
  data object Rejected : ArticleBridgeResult
}

internal class ArticleReaderBridge {
  private var sessionId: String? = null

  fun receive(raw: String): ArticleBridgeResult {
    if (raw.toByteArray().size > MAX_MESSAGE_BYTES) return ArticleBridgeResult.Rejected
    val message = runCatching { Json.parseToJsonElement(raw).jsonObject }.getOrNull()
      ?: return ArticleBridgeResult.Rejected
    val type = message["type"]?.jsonPrimitive?.content ?: return ArticleBridgeResult.Rejected
    val payload = message["payload"]?.jsonObject ?: return ArticleBridgeResult.Rejected

    if (type == "bridge:hello") return welcome(payload)
    if (message["sessionId"]?.jsonPrimitive?.content != sessionId) {
      return ArticleBridgeResult.Rejected
    }
    return if (type in acceptedMessages) ArticleBridgeResult.Accepted else ArticleBridgeResult.Rejected
  }

  private fun welcome(payload: JsonObject): ArticleBridgeResult {
    val protocol = payload["protocol"]?.jsonObject ?: return ArticleBridgeResult.Rejected
    val major = protocol["major"]?.jsonPrimitive?.intOrNull
    val minor = protocol["minor"]?.jsonPrimitive?.intOrNull
    if (major != PROTOCOL_MAJOR || minor == null || minor < 0) return ArticleBridgeResult.Rejected
    val offered = payload["capabilities"]?.jsonArray?.mapNotNull {
      runCatching { it.jsonPrimitive.content }.getOrNull()
    } ?: return ArticleBridgeResult.Rejected
    val negotiated = offered.filter(supportedCapabilities::contains)
    val newSession = UUID.randomUUID().toString().lowercase()
    sessionId = newSession
    val response = buildJsonObject {
      put("type", JsonPrimitive("bridge:welcome"))
      put("sessionId", JsonPrimitive(newSession))
      put("payload", buildJsonObject {
        put("protocol", buildJsonObject {
          put("major", JsonPrimitive(PROTOCOL_MAJOR))
          put("minor", JsonPrimitive(minor.coerceAtMost(PROTOCOL_MINOR)))
        })
        put("capabilities", JsonArray(negotiated.map(::JsonPrimitive)))
      })
    }.toString()
    return ArticleBridgeResult.Welcome(newSession, response)
  }

  private companion object {
    const val MAX_MESSAGE_BYTES = 1_000_000
    const val PROTOCOL_MAJOR = 1
    const val PROTOCOL_MINOR = 0
    val acceptedMessages = setOf(
      "reader:ready", "reader:height", "reader:error", "article:link", "article:image",
    )
    val supportedCapabilities = setOf(
      "article.set", "reader.settings", "reader.height", "article.link", "article.image",
    )
  }
}
