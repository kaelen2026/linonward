package com.linonward.app.feature.articlereader

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ArticleReaderBridgeTest {
  @Test
  fun `negotiates known capabilities and authenticates the page`() {
    val bridge = ArticleReaderBridge()
    val result = bridge.receive(
      """{"type":"bridge:hello","payload":{"protocol":{"major":1,"minor":4},"capabilities":["article.set","future"]}}"""
    )
    assertTrue(result is ArticleBridgeResult.Welcome)
    val welcome = result as ArticleBridgeResult.Welcome
    assertTrue(welcome.message.contains("\"minor\":0"))
    assertTrue(welcome.message.contains("article.set"))
    assertEquals(
      ArticleBridgeResult.Accepted("reader:ready", welcome.sessionId),
      bridge.receive(
        """{"type":"reader:ready","sessionId":"${welcome.sessionId}","payload":{"protocol":{"major":1,"minor":0}}}"""
      ),
    )
  }

  @Test
  fun `rejects incompatible protocol and stale sessions`() {
    val bridge = ArticleReaderBridge()
    assertEquals(
      ArticleBridgeResult.Rejected,
      bridge.receive(
        """{"type":"bridge:hello","payload":{"protocol":{"major":2,"minor":0},"capabilities":[]}}"""
      ),
    )
    assertEquals(
      ArticleBridgeResult.Rejected,
      bridge.receive("""{"type":"reader:ready","sessionId":"stale","payload":{}}"""),
    )
  }
}
