package com.linonward.app.feature.articlereader

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebResourceError
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.core.net.toUri
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewAssetLoader
import com.linonward.app.feature.reading.ReaderArticle
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

private const val BUNDLED_READER_URL =
  "https://appassets.androidplatform.net/assets/hybrid/article-reader/index.html"
private const val CACHED_READER_URL =
  "https://appassets.androidplatform.net/cached/index.html"

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun ArticleReaderScreen(
  article: ReaderArticle,
  onClose: () -> Unit,
  modifier: Modifier = Modifier,
) {
  BackHandler(onBack = onClose)
  val context = androidx.compose.ui.platform.LocalContext.current
  val bundleRoot = remember { HybridBundleUpdater.root(context) }
  var cachedRoot by remember { mutableStateOf(HybridBundleUpdater.activeRelease(bundleRoot)) }
  key(cachedRoot?.absolutePath) {
  AndroidView(
    modifier = modifier,
    factory = { context ->
      val loader = WebViewAssetLoader.Builder()
        .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
        .apply {
          cachedRoot?.let {
            addPathHandler("/cached/", WebViewAssetLoader.InternalStoragePathHandler(context, it))
          }
        }
        .build()
      WebView(context).apply {
        settings.javaScriptEnabled = true
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        settings.domStorageEnabled = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        settings.setSupportMultipleWindows(false)
        addJavascriptInterface(BridgeHost(this, article), "LinOnwardBridge")
        webViewClient = ReaderWebViewClient(
          context = context,
          assetLoader = loader,
          readerUrl = if (cachedRoot == null) BUNDLED_READER_URL else CACHED_READER_URL,
          onCachedLoadFailure = {
            HybridBundleUpdater.deactivate(bundleRoot)
            cachedRoot = null
          },
          onRendererGone = onClose,
        )
        loadUrl(if (cachedRoot == null) BUNDLED_READER_URL else CACHED_READER_URL)
      }
    },
    onRelease = { webView ->
      webView.stopLoading()
      webView.removeJavascriptInterface("LinOnwardBridge")
      webView.destroy()
    },
  )
  }
}

private class BridgeHost(private val webView: WebView, private val article: ReaderArticle) {
  private val bridge = ArticleReaderBridge()
  private val mainHandler = Handler(Looper.getMainLooper())

  @JavascriptInterface
  fun postMessage(raw: String) {
    val result = bridge.receive(raw)
    if (result is ArticleBridgeResult.Welcome) {
      send(result.message)
    } else if (result is ArticleBridgeResult.Accepted && result.type == "reader:ready") {
      val message = buildJsonObject {
        put("type", "article:set")
        put("sessionId", result.sessionId)
        put("payload", buildJsonObject {
          put("article", Json.encodeToJsonElement(ReaderArticle.serializer(), article))
        })
      }.toString()
      send(message)
    }
  }

  private fun send(message: String) {
    val encoded = android.util.Base64.encodeToString(message.toByteArray(), android.util.Base64.NO_WRAP)
    mainHandler.post {
      webView.evaluateJavascript("window.LinOnward.receive(JSON.parse(atob('$encoded')))", null)
    }
  }
}

// WebKit lint 1.17 does not recognize the Kotlin override below, even though it compiles to the
// platform callback. Keep the narrow suppression beside the implemented crash recovery.
@SuppressLint("MissingOnRenderProcessGone")
private class ReaderWebViewClient(
  private val context: Context,
  private val assetLoader: WebViewAssetLoader,
  private val readerUrl: String,
  private val onCachedLoadFailure: () -> Unit,
  private val onRendererGone: () -> Unit,
) : WebViewClient() {
  override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest) =
    assetLoader.shouldInterceptRequest(request.url)

  override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
    val url = request.url
    if (request.isForMainFrame && url.toString().startsWith(readerUrl.substringBefore("?"))) {
      return false
    }
    if (request.isForMainFrame && (url.scheme == "https" || url.scheme == "mailto")) {
      context.startActivity(Intent(Intent.ACTION_VIEW, url.toString().toUri()))
    }
    return true
  }

  override fun onReceivedError(
    view: WebView,
    request: WebResourceRequest,
    error: WebResourceError,
  ) {
    if (request.isForMainFrame && readerUrl == CACHED_READER_URL) onCachedLoadFailure()
  }

  override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
    view?.destroy()
    onRendererGone()
    return true
  }
}
