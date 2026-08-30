import Foundation
import UniformTypeIdentifiers
import WebKit

final class ArticleReaderSchemeHandler: NSObject, WKURLSchemeHandler {
  private let resourceRoot: URL?

  override init() {
    resourceRoot = Bundle.main.resourceURL?
      .appending(path: "ArticleReader", directoryHint: .isDirectory)
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
    guard let resourceRoot else { return nil }
    let relativePath = requestURL.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    let requested = relativePath.isEmpty ? "index.html" : relativePath
    let candidate = resourceRoot.appending(path: requested).standardizedFileURL
    guard candidate.path.hasPrefix(resourceRoot.standardizedFileURL.path + "/") else { return nil }
    if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
    return resourceRoot.appending(path: "index.html")
  }
}
