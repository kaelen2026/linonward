package com.linonward.app.feature.reading

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test

class ArticleServiceTest {
  @Test
  fun `builds the public article endpoint with a normalized locale`() {
    assertEquals(
      "https://api.example.com/api/content/articles?locale=en",
      articleEndpoint("https://api.example.com/", "en-US"),
    )
    assertEquals(
      "http://10.0.2.2:3001/api/content/articles?locale=zh",
      articleEndpoint("http://10.0.2.2:3001", "zh-CN"),
    )
    assertNull(articleEndpoint("file:///tmp/data", "en"))
  }

  @Test
  fun `decodes rich text into escaped reader html`() {
    val article = ArticleResponseDecoder().decode(
      """
      {"articles":[{
        "id":"article-1","title":"Safe article","authorName":"Ada",
        "content":{"type":"doc","content":[{"type":"paragraph","content":[
          {"type":"text","text":"<safe>","marks":[{"type":"strong"}]}
        ]}]},
        "coverImageUrl":null,"publishedAt":null,
        "updatedAt":"2026-08-30T00:00:00.000Z"
      }]}
      """.trimIndent(),
    ).single()

    assertEquals("<p><strong>&lt;safe&gt;</strong></p>", article.contentHtml)
    assertEquals("2026-08-30T00:00:00.000Z", article.publishedAt)
    assertEquals(1, article.readingMinutes)
  }

  @Test
  fun `falls back to Chinese when English has no published articles`() = runTest {
    val requests = mutableListOf<String>()
    val service = LiveArticleService("https://api.example.com") { endpoint ->
      requests += endpoint
      if (endpoint.endsWith("locale=en")) "{\"articles\":[]}" else chineseArticle
    }

    assertEquals("中文文章", service.articles("en-US").single().title)
    assertEquals(listOf("en", "zh"), requests.map { it.substringAfterLast('=') })
  }

  @Test
  fun `stores a successful response for later offline use`() = runTest {
    val fresh = listOf(article("fresh"))
    val cache = MemoryArticleCache()
    val service = OfflineArticleService(remote = ArticleService { fresh }, cache = cache)

    assertEquals(fresh, service.articles("en-US"))
    assertEquals(fresh, cache.load("en"))
  }

  @Test
  fun `returns the last snapshot when the remote request fails`() = runTest {
    val cached = listOf(article("cached"))
    val cache = MemoryArticleCache().apply { save("zh", cached) }
    val service = OfflineArticleService(
      remote = ArticleService { throw ArticleServiceException() },
      cache = cache,
    )

    assertEquals(cached, service.articles("zh-CN"))
  }

  @Test
  fun `preserves the remote failure when no snapshot exists`() {
    val failure = ArticleServiceException()
    val service = OfflineArticleService(
      remote = ArticleService { throw failure },
      cache = MemoryArticleCache(),
    )

    assertEquals(failure, assertThrows(ArticleServiceException::class.java) {
      runTest { service.articles("en") }
    })
  }

  @Test
  fun `does not turn cancellation into cached success`() {
    val cached = listOf(article("cached"))
    val cache = MemoryArticleCache().apply { seed("en", cached) }
    val service = OfflineArticleService(
      remote = ArticleService { throw CancellationException("cancelled") },
      cache = cache,
    )

    assertThrows(CancellationException::class.java) {
      runTest { service.articles("en") }
    }
  }

  private fun article(id: String) = ReaderArticle(
    author = "Author",
    contentHtml = "<p>Article</p>",
    cover = null,
    id = id,
    publishedAt = "2026-08-30T00:00:00.000Z",
    readingMinutes = 1,
    title = id,
  )

  private class MemoryArticleCache : ArticleCache {
    private val snapshots = mutableMapOf<String, List<ReaderArticle>>()

    fun seed(locale: String, articles: List<ReaderArticle>) {
      snapshots[localeCode(locale)] = articles
    }

    override suspend fun load(locale: String) = snapshots[localeCode(locale)]

    override suspend fun save(locale: String, articles: List<ReaderArticle>) {
      snapshots[localeCode(locale)] = articles
    }
  }

  private companion object {
    const val chineseArticle =
      "{\"articles\":[{\"id\":\"zh-1\",\"title\":\"中文文章\",\"authorName\":\"编辑部\"," +
        "\"content\":{\"type\":\"doc\"},\"coverImageUrl\":null,\"publishedAt\":null," +
        "\"updatedAt\":\"2026-08-30T00:00:00.000Z\"}]}"
  }
}
