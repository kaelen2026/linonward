package com.linonward.app.feature.articlereader

import android.content.Context
import androidx.core.content.edit
import java.io.File
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

private const val MAX_FILES = 512
private const val MAX_BYTES = 50_000_000L
private const val MAX_METADATA_BYTES = 256_000
private val HASH_PATTERN = Regex("^[a-f0-9]{64}$")
private val RELEASE_PATTERN = Regex("^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
private val PATH_PATTERN = Regex("^[A-Za-z0-9._/-]+$")

@Serializable
internal data class HybridReleaseChannel(
  val artifactVersion: String,
  val manifestUrl: String,
  val minimumAppVersion: String? = null,
  val releaseName: String,
  val rolloutPercentage: Int,
  val schemaVersion: Int,
)

@Serializable
internal data class HybridOfflineManifest(
  val artifactVersion: String,
  val entrypoint: String,
  val files: List<Asset>,
  val protocol: ProtocolVersion,
  val schemaVersion: Int,
) {
  @Serializable data class Asset(val path: String, val sha256: String, val size: Long)
  @Serializable data class ProtocolVersion(val major: Int, val minor: Int)
}

internal class HybridBundleUpdater(
  private val root: File,
  private val fetch: suspend (URI) -> ByteArray = ::fetchHttps,
) {
  suspend fun refresh(channelUri: URI, appVersion: String, rolloutSeed: String) {
    val channelData = fetch(channelUri).also { require(it.size <= MAX_METADATA_BYTES) }
    val channel = Json.decodeFromString<HybridReleaseChannel>(channelData.decodeToString())
    val manifestUri = validate(channel, channelUri, appVersion, rolloutSeed)
    val manifestData = fetch(manifestUri).also { require(it.size <= MAX_METADATA_BYTES) }
    val manifest = Json.decodeFromString<HybridOfflineManifest>(manifestData.decodeToString())
    validate(manifest, channel.artifactVersion)

    val releases = root.resolve("releases")
    val release = releases.resolve(manifest.artifactVersion)
    if (release.exists() && !verify(manifest, release)) release.deleteRecursively()
    if (!release.exists()) download(manifest, manifestUri, manifestData, releases, release)
    activate(manifest.artifactVersion)
  }

  private suspend fun download(
    manifest: HybridOfflineManifest,
    manifestUri: URI,
    manifestData: ByteArray,
    releases: File,
    release: File,
  ) {
    val staging = root.resolve("staging-${manifest.artifactVersion}")
    staging.deleteRecursively()
    check(staging.mkdirs())
    try {
      manifest.files.forEach { asset ->
        val data = fetch(manifestUri.resolve(asset.path))
        require(data.size.toLong() == asset.size && sha256(data) == asset.sha256)
        staging.resolve(asset.path).also {
          val parent = requireNotNull(it.parentFile)
          check(parent.mkdirs() || parent.isDirectory)
          it.writeBytes(data)
        }
      }
      staging.resolve("hybrid-manifest.json").writeBytes(manifestData)
      check(releases.mkdirs() || releases.isDirectory)
      Files.move(staging.toPath(), release.toPath(), StandardCopyOption.ATOMIC_MOVE)
    } catch (error: Throwable) {
      staging.deleteRecursively()
      throw error
    }
  }

  private fun validate(
    channel: HybridReleaseChannel,
    channelUri: URI,
    appVersion: String,
    rolloutSeed: String,
  ): URI {
    val manifestUri = URI(channel.manifestUrl)
    require(
      channel.schemaVersion == 1 && HASH_PATTERN.matches(channel.artifactVersion) &&
        RELEASE_PATTERN.matches(channel.releaseName) && channel.rolloutPercentage in 0..100 &&
        secure(manifestUri) && sameOrigin(channelUri, manifestUri) &&
        manifestUri.path.endsWith("/releases/${channel.artifactVersion}/hybrid-manifest.json"),
    )
    require(channel.minimumAppVersion == null || compareVersions(appVersion, channel.minimumAppVersion) >= 0)
    require(rolloutBucket(rolloutSeed, channel.artifactVersion) < channel.rolloutPercentage)
    return manifestUri
  }

  private fun validate(manifest: HybridOfflineManifest, expectedVersion: String) {
    require(manifest.protocol.major == 1)
    require(
      manifest.schemaVersion == 1 && manifest.protocol.minor >= 0 &&
        manifest.artifactVersion == expectedVersion && manifest.entrypoint == "index.html" &&
        manifest.files.size <= MAX_FILES && manifest.files.map { it.path }.toSet().size == manifest.files.size &&
        manifest.files.any { it.path == "index.html" } && manifest.files.sumOf { it.size } <= MAX_BYTES &&
        manifest.files.all(::valid) && artifactVersion(manifest.files) == manifest.artifactVersion,
    )
  }

  private fun valid(asset: HybridOfflineManifest.Asset) =
    asset.path.isNotEmpty() && !asset.path.startsWith('/') && !asset.path.contains("..") &&
      PATH_PATTERN.matches(asset.path) && HASH_PATTERN.matches(asset.sha256) && asset.size in 0..MAX_BYTES

  private fun verify(manifest: HybridOfflineManifest, release: File) = manifest.files.all { asset ->
    val file = release.resolve(asset.path)
    file.isFile && file.length() == asset.size && sha256(file.readBytes()) == asset.sha256
  }

  private fun activate(version: String) {
    check(root.mkdirs() || root.isDirectory)
    val temporary = root.resolve("active-version.tmp")
    temporary.writeText("$version\n")
    Files.move(
      temporary.toPath(),
      root.resolve("active-version").toPath(),
      StandardCopyOption.ATOMIC_MOVE,
      StandardCopyOption.REPLACE_EXISTING,
    )
  }

  private fun artifactVersion(files: List<HybridOfflineManifest.Asset>) = sha256(
    files.joinToString("\n") { "${it.path}\u0000${it.sha256}\u0000${it.size}" }.encodeToByteArray(),
  )

  private fun rolloutBucket(seed: String, version: String): Int =
    sha256Bytes("$seed:$version".encodeToByteArray()).take(4)
      .fold(0L) { value, byte -> (value shl 8) or (byte.toLong() and 0xff) }.rem(100).toInt()

  private fun compareVersions(left: String, right: String): Int {
    val lhs = left.split('.').map { it.toIntOrNull() ?: 0 }
    val rhs = right.split('.').map { it.toIntOrNull() ?: 0 }
    return (0 until maxOf(lhs.size, rhs.size)).firstNotNullOfOrNull { index ->
      (lhs.getOrElse(index) { 0 } - rhs.getOrElse(index) { 0 }).takeIf { it != 0 }
    } ?: 0
  }

  companion object {
    fun root(context: Context) = File(context.cacheDir, "hybrid-article-reader")

    fun activeRelease(root: File): File? {
      val version = root.resolve("active-version").takeIf(File::isFile)?.readText()?.trim() ?: return null
      if (!HASH_PATTERN.matches(version)) return null
      return root.resolve("releases/$version").takeIf { it.resolve("index.html").isFile }
    }

    fun deactivate(root: File) { root.resolve("active-version").delete() }

    fun rolloutSeed(context: Context): String {
      val preferences = context.getSharedPreferences("hybrid-release", Context.MODE_PRIVATE)
      return preferences.getString("rollout-seed", null) ?: UUID.randomUUID().toString().also {
        preferences.edit { putString("rollout-seed", it) }
      }
    }

    fun secureChannel(raw: String): URI? = runCatching { URI(raw.trim()) }.getOrNull()?.takeIf(::secure)

    private fun secure(uri: URI) = uri.scheme.equals("https", ignoreCase = true) &&
      !uri.host.isNullOrBlank() && uri.userInfo == null && uri.query == null && uri.fragment == null

    private fun sameOrigin(left: URI, right: URI) =
      left.scheme.equals(right.scheme, ignoreCase = true) && left.host.equals(right.host, ignoreCase = true) &&
        (if (left.port == -1) 443 else left.port) == (if (right.port == -1) 443 else right.port)

    private fun sha256(data: ByteArray) = sha256Bytes(data).joinToString("") { "%02x".format(it) }
    private fun sha256Bytes(data: ByteArray) = MessageDigest.getInstance("SHA-256").digest(data)

    private suspend fun fetchHttps(uri: URI): ByteArray = withContext(Dispatchers.IO) {
      require(secure(uri))
      val connection = URL(uri.toString()).openConnection() as HttpURLConnection
      connection.useCaches = false
      connection.instanceFollowRedirects = false
      connection.connectTimeout = 10_000
      connection.readTimeout = 20_000
      try {
        require(connection.responseCode == HttpURLConnection.HTTP_OK)
        connection.inputStream.use { it.readBytes() }
      } finally {
        connection.disconnect()
      }
    }
  }
}
