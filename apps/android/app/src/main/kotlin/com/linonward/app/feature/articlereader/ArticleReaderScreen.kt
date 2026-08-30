package com.linonward.app.feature.articlereader

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.core.net.toUri
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewAssetLoader

private const val READER_URL =
  "https://appassets.androidplatform.net/assets/hybrid/article-reader/index.html?demo=1"

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun ArticleReaderScreen(onClose: () -> Unit, modifier: Modifier = Modifier) {
  BackHandler(onBack = onClose)
  AndroidView(
    modifier = modifier,
    factory = { context ->
      val loader = WebViewAssetLoader.Builder()
        .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
        .build()
      WebView(context).apply {
        settings.javaScriptEnabled = true
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        settings.domStorageEnabled = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        settings.setSupportMultipleWindows(false)
        addJavascriptInterface(BridgeHost(this), "LinOnwardBridge")
        webViewClient = ReaderWebViewClient(context, loader, onClose)
        loadUrl(READER_URL)
      }
    },
    onRelease = { webView ->
      webView.stopLoading()
      webView.removeJavascriptInterface("LinOnwardBridge")
      webView.destroy()
    },
  )
}

private class BridgeHost(private val webView: WebView) {
  private val bridge = ArticleReaderBridge()
  private val mainHandler = Handler(Looper.getMainLooper())

  @JavascriptInterface
  fun postMessage(raw: String) {
    val result = bridge.receive(raw)
    if (result is ArticleBridgeResult.Welcome) {
      val encoded = android.util.Base64.encodeToString(
        result.message.toByteArray(),
        android.util.Base64.NO_WRAP,
      )
      mainHandler.post {
        webView.evaluateJavascript("window.LinOnward.receive(JSON.parse(atob('$encoded')))", null)
      }
    }
  }
}

// WebKit lint 1.17 does not recognize the Kotlin override below, even though it compiles to the
// platform callback. Keep the narrow suppression beside the implemented crash recovery.
@SuppressLint("MissingOnRenderProcessGone")
private class ReaderWebViewClient(
  private val context: Context,
  private val assetLoader: WebViewAssetLoader,
  private val onRendererGone: () -> Unit,
) : WebViewClient() {
  override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest) =
    assetLoader.shouldInterceptRequest(request.url)

  override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
    val url = request.url
    if (request.isForMainFrame && url.toString().startsWith(READER_URL.substringBefore("?"))) {
      return false
    }
    if (request.isForMainFrame && (url.scheme == "https" || url.scheme == "mailto")) {
      context.startActivity(Intent(Intent.ACTION_VIEW, url.toString().toUri()))
    }
    return true
  }

  override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
    view?.destroy()
    onRendererGone()
    return true
  }
}
