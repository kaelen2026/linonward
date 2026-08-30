import Foundation
import UniformTypeIdentifiers
import WebKit

final class ArticleReaderSchemeHandler: NSObject, WKURLSchemeHandler {
  private let resourceRoot: URL

  init(resourceRoot: URL) {
    self.resourceRoot = resourceRoot
    super.init()
  }

  func webView(_ webView: WKWebView, start urlSchemeTask: any WKURLSchemeTask) {
    guard let requestURL = urlSchemeTask.request.url,
      requestURL.scheme == ArticleReaderConfiguration.bundledScheme,
      requestURL.host == ArticleReaderConfiguration.bundledHost,
      let fileURL = resolvedFileURL(for: requestURL),
      let data = try? Data(contentsOf: fileURL)
    else {
      urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
      return
    }

    let mimeType = UTType(filenameExtension: fileURL.pathExtension)?.preferredMIMEType
      ?? "application/octet-stream"
    let response = URLResponse(
      url: requestURL,
      mimeType: mimeType,
      expectedContentLength: data.count,
      textEncodingName: mimeType.hasPrefix("text/") ? "utf-8" : nil
    )
    urlSchemeTask.didReceive(response)
    urlSchemeTask.didReceive(data)
    urlSchemeTask.didFinish()
  }

  func webView(_ webView: WKWebView, stop urlSchemeTask: any WKURLSchemeTask) {}

  private func resolvedFileURL(for requestURL: URL) -> URL? {
    let relativePath = requestURL.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    let requested = relativePath.isEmpty ? "index.html" : relativePath
    let candidate = resourceRoot.appending(path: requested).standardizedFileURL
    guard candidate.path.hasPrefix(resourceRoot.standardizedFileURL.path + "/") else { return nil }
    if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
    return requested.contains(".") ? nil : resourceRoot.appending(path: "index.html")
  }
}
