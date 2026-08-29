import Foundation
import Testing

@testable import LinOnward

@Suite("Article reader configuration")
struct ArticleReaderConfigurationTests {
  @Test("accepts HTTPS and preserves its path")
  func acceptsSecureOrigin() throws {
    let configuration = try #require(
      ArticleReaderConfiguration(rawValue: "https://reader.example.com/h5/")
    )

    #expect(configuration.url.absoluteString == "https://reader.example.com/h5/")
    #expect(
      configuration.allowsMainFrameNavigation(
        to: try #require(URL(string: "https://reader.example.com/h5/assets/app.js"))
      )
    )
    #expect(
      !configuration.allowsMainFrameNavigation(
        to: try #require(URL(string: "https://reader.example.com/account"))
      )
    )
  }

  @Test("refuses insecure remote and credential-bearing URLs")
  func rejectsUnsafeOrigins() {
    #expect(ArticleReaderConfiguration(rawValue: "http://example.com") == nil)
    #expect(ArticleReaderConfiguration(rawValue: "https://user:pass@example.com") == nil)
    #expect(ArticleReaderConfiguration(rawValue: "javascript:alert(1)") == nil)
  }

  @Test("allows HTTP localhost only when development explicitly requests it")
  func scopesDevelopmentException() {
    #expect(ArticleReaderConfiguration(rawValue: "http://localhost:3003") == nil)
    #expect(
      ArticleReaderConfiguration(
        rawValue: "http://localhost:3003",
        allowsLocalhostHTTP: true
      ) != nil
    )
    #expect(
      ArticleReaderConfiguration(
        rawValue: "http://192.168.1.20:3003",
        allowsLocalhostHTTP: true
      ) == nil
    )
  }

  @Test("blocks a redirect to another origin")
  func blocksOriginChanges() throws {
    let configuration = try #require(
      ArticleReaderConfiguration(rawValue: "https://reader.example.com")
    )

    #expect(
      !configuration.allowsMainFrameNavigation(
        to: try #require(URL(string: "https://evil.example.com/article"))
      )
    )
    #expect(
      !configuration.allowsMainFrameNavigation(
        to: try #require(URL(string: "https://reader.example.com:8443/article"))
      )
    )
  }
}

@Suite("Article bridge decoding")
struct ArticleBridgeDecoderTests {
  private let decoder = ArticleBridgeDecoder()
  private let session = "12345678-1234-1234-1234-123456789abc"

  @Test("negotiates the compatible protocol and known capabilities")
  func decodesHello() throws {
    let event = try decoder.decode(
      body: [
        "type": "bridge:hello",
        "payload": [
          "protocol": ["major": 1, "minor": 4],
          "capabilities": ["article.set", "future.capability"],
        ],
      ],
      expectedSession: nil
    )

    #expect(
      event == .hello(
        protocolVersion: ArticleBridgeProtocol(major: 1, minor: 4),
        capabilities: [.articleSet]
      )
    )
  }

  @Test("rejects an incompatible major version")
  func rejectsMajorVersion() {
    #expect(throws: ArticleBridgeDecodingError.protocolMismatch) {
      try decoder.decode(
        body: [
          "type": "bridge:hello",
          "payload": ["protocol": ["major": 2, "minor": 0], "capabilities": []],
        ],
        expectedSession: nil
      )
    }
  }

  @Test("rejects a replay from another page session")
  func rejectsWrongSession() {
    #expect(throws: ArticleBridgeDecodingError.sessionMismatch) {
      try decoder.decode(
        body: [
          "type": "reader:height",
          "sessionId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          "payload": ["height": 900],
        ],
        expectedSession: session
      )
    }
  }

  @Test("accepts safe links and rejects executable URLs")
  func validatesLinks() throws {
    let safe = try decoder.decode(
      body: [
        "type": "article:link",
        "sessionId": session,
        "payload": ["href": "https://linonward.com/article"],
      ],
      expectedSession: session
    )
    #expect(safe == .link(try #require(URL(string: "https://linonward.com/article"))))

    #expect(throws: ArticleBridgeDecodingError.unsafeURL) {
      try decoder.decode(
        body: [
          "type": "article:link",
          "sessionId": session,
          "payload": ["href": "javascript:alert(1)"],
        ],
        expectedSession: session
      )
    }
  }

  @Test("bounds content-height messages")
  func boundsHeight() {
    #expect(throws: ArticleBridgeDecodingError.invalidMessage) {
      try decoder.decode(
        body: [
          "type": "reader:height",
          "sessionId": session,
          "payload": ["height": 1_000_000],
        ],
        expectedSession: session
      )
    }
  }
}
