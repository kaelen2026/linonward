package com.linonward.app.feature.reading

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
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

  private companion object {
    const val chineseArticle =
      "{\"articles\":[{\"id\":\"zh-1\",\"title\":\"中文文章\",\"authorName\":\"编辑部\"," +
        "\"content\":{\"type\":\"doc\"},\"coverImageUrl\":null,\"publishedAt\":null," +
        "\"updatedAt\":\"2026-08-30T00:00:00.000Z\"}]}"
  }
}
