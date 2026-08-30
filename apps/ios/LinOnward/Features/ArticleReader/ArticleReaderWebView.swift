import SwiftUI
import WebKit

struct ArticleReaderWebView: UIViewRepresentable {
  let article: ReaderArticle
  let configuration: ArticleReaderConfiguration
  let settings: ReaderSettings
  let onError: (String) -> Void
  let onExternalURL: (URL) -> Void
  let onHeightChange: (Double) -> Void
  let onImage: (ArticlePreview) -> Void

  func makeCoordinator() -> Coordinator {
    Coordinator(parent: self)
  }

  func makeUIView(context: Context) -> WKWebView {
    let contentController = WKUserContentController()
    contentController.add(context.coordinator, name: Coordinator.handlerName)

    let webConfiguration = WKWebViewConfiguration()
    webConfiguration.defaultWebpagePreferences.allowsContentJavaScript = true
    webConfiguration.preferences.javaScriptCanOpenWindowsAutomatically = false
    webConfiguration.userContentController = contentController
    webConfiguration.websiteDataStore = .nonPersistent()
    if configuration.usesBundledResources {
      webConfiguration.setURLSchemeHandler(
        ArticleReaderSchemeHandler(),
        forURLScheme: ArticleReaderConfiguration.bundledScheme
      )
    }

    let webView = WKWebView(frame: .zero, configuration: webConfiguration)
    webView.allowsBackForwardNavigationGestures = false
    webView.isOpaque = false
    webView.navigationDelegate = context.coordinator
    webView.scrollView.contentInsetAdjustmentBehavior = .never
    #if DEBUG
      webView.isInspectable = true
    #endif
    context.coordinator.webView = webView
    webView.load(
      URLRequest(
        url: configuration.articleURL(id: article.id),
        cachePolicy: .reloadIgnoringLocalCacheData
      )
    )
    return webView
  }

  func updateUIView(_ webView: WKWebView, context: Context) {
    context.coordinator.update(parent: self)
    context.coordinator.sendSettingsIfReady()
  }

  static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
    webView.stopLoading()
    webView.navigationDelegate = nil
    webView.configuration.userContentController.removeScriptMessageHandler(
      forName: Coordinator.handlerName
    )
    coordinator.webView = nil
  }

  @MainActor
  final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    static let handlerName = "linonward"

    weak var webView: WKWebView?
    private var article: ReaderArticle
    private var bridgeSession: String?
    private var configuration: ArticleReaderConfiguration
    private let decoder = ArticleBridgeDecoder()
    private var lastSettings: ReaderSettings?
    private var negotiatedCapabilities = Set<ArticleBridgeCapability>()
    private var onError: (String) -> Void
    private var onExternalURL: (URL) -> Void
    private var onHeightChange: (Double) -> Void
    private var onImage: (ArticlePreview) -> Void
    private var settings: ReaderSettings

    init(parent: ArticleReaderWebView) {
      article = parent.article
      configuration = parent.configuration
      onError = parent.onError
      onExternalURL = parent.onExternalURL
      onHeightChange = parent.onHeightChange
      onImage = parent.onImage
      settings = parent.settings
    }

    func update(parent: ArticleReaderWebView) {
      article = parent.article
      configuration = parent.configuration
      onError = parent.onError
      onExternalURL = parent.onExternalURL
      onHeightChange = parent.onHeightChange
      onImage = parent.onImage
      settings = parent.settings
    }

    func userContentController(
      _ userContentController: WKUserContentController,
      didReceive message: WKScriptMessage
    ) {
      guard message.name == Self.handlerName,
        message.frameInfo.isMainFrame,
        let sourceURL = message.frameInfo.request.url,
        configuration.allowsMainFrameNavigation(to: sourceURL)
      else {
        onError("UNTRUSTED_MESSAGE_SOURCE")
        return
      }

      do {
        let event = try decoder.decode(body: message.body, expectedSession: bridgeSession)
        handle(event)
      } catch let error as ArticleBridgeDecodingError {
        onError(String(describing: error))
      } catch {
        onError("INVALID_MESSAGE")
      }
    }

    func webView(
      _ webView: WKWebView,
      decidePolicyFor navigationAction: WKNavigationAction,
      decisionHandler: @escaping @MainActor (WKNavigationActionPolicy) -> Void
    ) {
      guard let target = navigationAction.request.url else {
        decisionHandler(.cancel)
        return
      }

      guard navigationAction.targetFrame?.isMainFrame == true else {
        decisionHandler(.cancel)
        if let scheme = target.scheme?.lowercased(), ["https", "mailto"].contains(scheme) {
          onExternalURL(target)
        }
        return
      }

      if configuration.allowsMainFrameNavigation(to: target) {
        decisionHandler(.allow)
      } else {
        decisionHandler(.cancel)
        if let scheme = target.scheme?.lowercased(), ["https", "mailto"].contains(scheme) {
          onExternalURL(target)
        }
      }
    }

    func webView(
      _ webView: WKWebView,
      didFailProvisionalNavigation navigation: WKNavigation?,
      withError error: any Error
    ) {
      onError("LOAD_FAILED")
    }

    func webView(
      _ webView: WKWebView,
      didFail navigation: WKNavigation?,
      withError error: any Error
    ) {
      onError("LOAD_FAILED")
    }

    func sendSettingsIfReady() {
      guard bridgeSession != nil, lastSettings != settings,
        negotiatedCapabilities.contains(.readerSettings)
      else { return }
      lastSettings = settings
      send(type: "reader:settings", payload: settings)
    }

    private func handle(_ event: ArticleBridgeEvent) {
      switch event {
      case .hello(let protocolVersion, let capabilities):
        bridgeSession = UUID().uuidString.lowercased()
        negotiatedCapabilities = capabilities.intersection(Set(ArticleBridgeCapability.allCases))
        lastSettings = nil
        sendWelcome(negotiatedMinor: min(protocolVersion.minor, ArticleBridgeProtocol.current.minor))
      case .ready:
        guard negotiatedCapabilities.contains(.articleSet) else {
          onError("MISSING_ARTICLE_CAPABILITY")
          return
        }
        send(type: "article:set", payload: ReaderArticlePayload(article: article, settings: settings))
        lastSettings = settings
      case .height(let height):
        guard negotiatedCapabilities.contains(.readerHeight) else { return }
        onHeightChange(height)
      case .error(let code):
        onError(code)
      case .link(let url):
        guard negotiatedCapabilities.contains(.articleLink) else { return }
        onExternalURL(url)
      case .image(let image):
        guard negotiatedCapabilities.contains(.articleImage) else { return }
        onImage(image)
      }
    }

    private func sendWelcome(negotiatedMinor: Int) {
      guard let bridgeSession else { return }
      let payload: [String: Any] = [
        "protocol": ["major": ArticleBridgeProtocol.current.major, "minor": negotiatedMinor],
        "capabilities": negotiatedCapabilities.map(\.rawValue).sorted(),
      ]
      send(type: "bridge:welcome", payloadObject: payload, session: bridgeSession)
    }

    private func send<Payload: Encodable>(type: String, payload: Payload) {
      do {
        let data = try JSONEncoder().encode(payload)
        let object = try JSONSerialization.jsonObject(with: data)
        send(type: type, payloadObject: object, session: bridgeSession)
      } catch {
        onError("ENCODING_FAILED")
      }
    }

    private func send(type: String, payloadObject: Any, session: String?) {
      guard let webView, let session else { return }
      let envelope: [String: Any] = [
        "type": type,
        "sessionId": session,
        "payload": payloadObject,
      ]
      guard JSONSerialization.isValidJSONObject(envelope),
        let data = try? JSONSerialization.data(withJSONObject: envelope),
        data.count <= ArticleBridgeDecoder.maximumMessageSize
      else {
        onError("MESSAGE_TOO_LARGE")
        return
      }
      let encoded = data.base64EncodedString()
      let script = "window.LinOnward.receive(JSON.parse(atob('\(encoded)')))"
      webView.evaluateJavaScript(script) { [weak self] _, error in
        if error != nil { self?.onError("JAVASCRIPT_FAILED") }
      }
    }
  }
}
