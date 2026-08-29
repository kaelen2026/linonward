import CoreFoundation
import Foundation

struct ArticleBridgeProtocol: Equatable, Sendable {
  static let current = ArticleBridgeProtocol(major: 1, minor: 0)

  let major: Int
  let minor: Int
}

enum ArticleBridgeCapability: String, CaseIterable, Codable, Sendable {
  case articleSet = "article.set"
  case readerSettings = "reader.settings"
  case readerHeight = "reader.height"
  case articleLink = "article.link"
  case articleImage = "article.image"
}

enum ArticleBridgeEvent: Equatable, Sendable {
  case hello(protocolVersion: ArticleBridgeProtocol, capabilities: Set<ArticleBridgeCapability>)
  case ready
  case height(Double)
  case error(code: String)
  case link(URL)
  case image(ArticlePreview)
}

enum ArticleBridgeDecodingError: Error, Equatable {
  case invalidMessage
  case messageTooLarge
  case protocolMismatch
  case sessionMismatch
  case unsafeURL
}

struct ArticleBridgeDecoder: Sendable {
  static let maximumMessageSize = 1_000_000

  func decode(body: Any, expectedSession: String?) throws -> ArticleBridgeEvent {
    guard JSONSerialization.isValidJSONObject(body) else {
      throw ArticleBridgeDecodingError.invalidMessage
    }
    let data = try JSONSerialization.data(withJSONObject: body)
    guard data.count <= Self.maximumMessageSize else {
      throw ArticleBridgeDecodingError.messageTooLarge
    }
    guard let message = body as? [String: Any], let type = message["type"] as? String,
      let payload = message["payload"] as? [String: Any]
    else { throw ArticleBridgeDecodingError.invalidMessage }

    if type == "bridge:hello" {
      return try decodeHello(payload)
    }

    guard let expectedSession,
      let receivedSession = message["sessionId"] as? String,
      receivedSession == expectedSession
    else { throw ArticleBridgeDecodingError.sessionMismatch }

    switch type {
    case "reader:ready":
      guard let version = payload["protocol"] as? [String: Any],
        integer(version["major"]) == ArticleBridgeProtocol.current.major,
        let minor = integer(version["minor"]), minor >= 0
      else { throw ArticleBridgeDecodingError.protocolMismatch }
      return .ready
    case "reader:height":
      guard let height = number(payload["height"]), height.isFinite, height > 0, height < 100_000
      else { throw ArticleBridgeDecodingError.invalidMessage }
      return .height(height)
    case "reader:error":
      guard let code = payload["code"] as? String, code.count <= 100 else {
        throw ArticleBridgeDecodingError.invalidMessage
      }
      return .error(code: code)
    case "article:link":
      guard let rawURL = payload["href"] as? String, let url = safeExternalURL(rawURL) else {
        throw ArticleBridgeDecodingError.unsafeURL
      }
      return .link(url)
    case "article:image":
      guard let rawURL = payload["src"] as? String, let url = safeMediaURL(rawURL),
        let alt = payload["alt"] as? String, alt.count <= 500
      else { throw ArticleBridgeDecodingError.unsafeURL }
      return .image(ArticlePreview(alt: alt, url: url))
    default:
      throw ArticleBridgeDecodingError.invalidMessage
    }
  }

  private func decodeHello(_ payload: [String: Any]) throws -> ArticleBridgeEvent {
    guard let version = payload["protocol"] as? [String: Any],
      let major = integer(version["major"]), let minor = integer(version["minor"]),
      major == ArticleBridgeProtocol.current.major, minor >= 0,
      let rawCapabilities = payload["capabilities"] as? [String]
    else { throw ArticleBridgeDecodingError.protocolMismatch }
    let capabilities = Set(rawCapabilities.compactMap(ArticleBridgeCapability.init(rawValue:)))
    return .hello(
      protocolVersion: ArticleBridgeProtocol(major: major, minor: minor),
      capabilities: capabilities
    )
  }

  private func safeExternalURL(_ value: String) -> URL? {
    guard let components = URLComponents(string: value), components.user == nil,
      components.password == nil, let scheme = components.scheme?.lowercased(),
      ["https", "mailto"].contains(scheme)
    else { return nil }
    return components.url
  }

  private func safeMediaURL(_ value: String) -> URL? {
    guard let components = URLComponents(string: value), components.user == nil,
      components.password == nil,
      components.scheme?.lowercased() == "https"
        || (components.scheme?.lowercased() == "http"
          && ["localhost", "127.0.0.1", "::1"].contains(components.host?.lowercased() ?? ""))
    else { return nil }
    return components.url
  }

  private func integer(_ value: Any?) -> Int? {
    if let value = value as? Int { return value }
    guard let value = value as? NSNumber,
      CFGetTypeID(value) != CFBooleanGetTypeID(),
      value.doubleValue.rounded(.towardZero) == value.doubleValue
    else { return nil }
    return value.intValue
  }

  private func number(_ value: Any?) -> Double? {
    if let value = value as? Double { return value }
    guard let value = value as? NSNumber, CFGetTypeID(value) != CFBooleanGetTypeID() else {
      return nil
    }
    return value.doubleValue
  }
}
