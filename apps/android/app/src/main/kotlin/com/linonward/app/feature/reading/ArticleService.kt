package com.linonward.app.feature.reading

import com.linonward.app.BuildConfig
import java.net.HttpURLConnection
import java.net.URI
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

fun interface ArticleService {
  suspend fun articles(locale: String): List<ReaderArticle>
}

interface ArticleCache {
  suspend fun load(locale: String): List<ReaderArticle>?
  suspend fun save(locale: String, articles: List<ReaderArticle>)
}

class OfflineArticleService(
  private val remote: ArticleService,
  private val cache: ArticleCache,
) : ArticleService {
  override suspend fun articles(locale: String): List<ReaderArticle> = try {
    remote.articles(locale).also { articles ->
      try {
        cache.save(locale, articles)
      } catch (cancelled: CancellationException) {
        throw cancelled
      } catch (_: Exception) {
        // A cache write must not hide fresh content that is ready to display.
      }
    }
  } catch (cancelled: CancellationException) {
    throw cancelled
  } catch (remoteFailure: Exception) {
    try {
      cache.load(locale) ?: throw remoteFailure
    } catch (cancelled: CancellationException) {
      throw cancelled
    } catch (_: Exception) {
      throw remoteFailure
    }
  }
}

class LiveArticleService(
  private val baseUrl: String = BuildConfig.API_BASE_URL,
  private val fetch: suspend (String) -> String = ::fetchJson,
) : ArticleService {
  override suspend fun articles(locale: String): List<ReaderArticle> {
    val primary = request(localeCode(locale))
    if (primary.isNotEmpty() || !locale.lowercase().startsWith("en")) return primary
    return request("zh")
  }

  private suspend fun request(locale: String): List<ReaderArticle> {
    val endpoint = articleEndpoint(baseUrl, locale) ?: throw ArticleServiceException()
    return ArticleResponseDecoder().decode(fetch(endpoint))
  }
}

class ArticleServiceException : Exception()

internal fun articleEndpoint(baseUrl: String, locale: String): String? {
  val origin = runCatching { URI(baseUrl.trim()) }.getOrNull() ?: return null
  if (origin.scheme !in setOf("http", "https") || origin.host.isNullOrBlank()) return null
  if (origin.userInfo != null || origin.query != null || origin.fragment != null) return null
  val root = baseUrl.trim().trimEnd('/')
  val encoded = URLEncoder.encode(localeCode(locale), StandardCharsets.UTF_8.name())
  return "$root/api/content/articles?locale=$encoded"
}

internal fun localeCode(locale: String) = if (locale.lowercase().startsWith("en")) "en" else "zh"

private suspend fun fetchJson(endpoint: String): String = withContext(Dispatchers.IO) {
  val connection = URI(endpoint).toURL().openConnection() as HttpURLConnection
  try {
    connection.requestMethod = "GET"
    connection.setRequestProperty("Accept", "application/json")
    connection.connectTimeout = 10_000
    connection.readTimeout = 15_000
    if (connection.responseCode != HttpURLConnection.HTTP_OK) throw ArticleServiceException()
    connection.inputStream.bufferedReader().use { it.readText() }
  } finally {
    connection.disconnect()
  }
}

internal class ArticleResponseDecoder {
  private val json = Json { ignoreUnknownKeys = true }

  fun decode(raw: String): List<ReaderArticle> =
    json.decodeFromString<ArticlesResponse>(raw).articles.map(PublishedArticle::readerArticle)
}

@Serializable
private data class ArticlesResponse(val articles: List<PublishedArticle>)

@Serializable
private data class PublishedArticle(
  val authorName: String,
  val content: RichTextNode,
  val coverImageUrl: String?,
  val id: String,
  val publishedAt: String?,
  val title: String,
  val updatedAt: String,
) {
  fun readerArticle() = ReaderArticle(
    author = authorName,
    contentHtml = content.html(),
    cover = coverImageUrl?.let { ReaderArticleImage(title, null, it) },
    id = id,
    publishedAt = publishedAt ?: updatedAt,
    readingMinutes = maxOf(1, (content.characterCount() + 399) / 400),
    title = title,
  )
}

@Serializable
private data class RichTextNode(
  val attrs: Attributes? = null,
  val content: List<RichTextNode>? = null,
  val marks: List<Mark>? = null,
  val text: String? = null,
  val type: String,
) {
  fun characterCount(): Int =
    text.orEmpty().count { !it.isWhitespace() } + content.orEmpty().sumOf(RichTextNode::characterCount)

  fun html(): String {
    if (type == "text") {
      return marks.orEmpty().fold(text.orEmpty().escapedHtml()) { value, mark ->
        when (mark.type) {
          "strong" -> "<strong>$value</strong>"
          "em" -> "<em>$value</em>"
          "code" -> "<code>$value</code>"
          "link" -> mark.attrs?.href?.let { "<a href=\"${it.escapedHtml()}\">$value</a>" } ?: value
          else -> value
        }
      }
    }
    val children = content.orEmpty().joinToString("") { it.html() }
    return when (type) {
      "paragraph" -> "<p>$children</p>"
      "heading" -> if (attrs?.level == 1) "<h2>$children</h2>" else "<h3>$children</h3>"
      "blockquote" -> "<blockquote>$children</blockquote>"
      "bullet_list" -> "<ul>$children</ul>"
      "ordered_list" -> "<ol>$children</ol>"
      "list_item" -> "<li>$children</li>"
      "hard_break" -> "<br>"
      else -> children
    }
  }
}

@Serializable
private data class Attributes(val href: String? = null, val level: Int? = null)

@Serializable
private data class Mark(val attrs: Attributes? = null, val type: String)

private fun String.escapedHtml() =
  replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    .replace("\"", "&quot;").replace("'", "&#039;")
