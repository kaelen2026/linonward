package com.linonward.app.feature.articlereader

import java.net.URI
import java.security.MessageDigest
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class HybridBundleUpdaterTest {
  @get:Rule val temporaryFolder = TemporaryFolder()

  @Test
  fun `downloads verifies and activates an immutable release`() = runTest {
    val fixture = fixture()
    val root = temporaryFolder.newFolder("hybrid")

    HybridBundleUpdater(root) { fixture.responses.getValue(it) }.refresh(
      fixture.channelUri,
      "1.2.0",
      "installation-1",
    )

    val release = requireNotNull(HybridBundleUpdater.activeRelease(root))
    assertEquals(fixture.index, release.resolve("index.html").readText())
  }

  @Test
  fun `keeps the previous pointer when integrity verification fails`() {
    val fixture = fixture(corruptAsset = true)
    val root = temporaryFolder.newFolder("hybrid")
    val previous = "b".repeat(64)
    root.resolve("active-version").writeText(previous)

    assertThrows(IllegalArgumentException::class.java) {
      runTest {
        HybridBundleUpdater(root) { fixture.responses.getValue(it) }.refresh(
          fixture.channelUri,
          "1.2.0",
          "installation-1",
        )
      }
    }
    assertEquals(previous, root.resolve("active-version").readText().trim())
  }

  @Test
  fun `repairs a corrupted cached release before activation`() = runTest {
    val fixture = fixture()
    val root = temporaryFolder.newFolder("hybrid")
    root.resolve("releases/${fixture.artifactVersion}").also {
      check(it.mkdirs())
      it.resolve("index.html").writeText("corrupt")
    }

    HybridBundleUpdater(root) { fixture.responses.getValue(it) }.refresh(
      fixture.channelUri,
      "1.2.0",
      "installation-1",
    )

    assertEquals(
      fixture.index,
      root.resolve("releases/${fixture.artifactVersion}/index.html").readText(),
    )
  }

  @Test
  fun `rejects another bridge major`() {
    val fixture = fixture(protocolMajor = 2)
    assertThrows(IllegalArgumentException::class.java) {
      runTest {
        HybridBundleUpdater(temporaryFolder.newFolder("hybrid")) {
          fixture.responses.getValue(it)
        }.refresh(fixture.channelUri, "1.2.0", "installation-1")
      }
    }
  }

  private fun fixture(corruptAsset: Boolean = false, protocolMajor: Int = 1): Fixture {
    val index = "<main>LinOnward</main>"
    val indexData = index.encodeToByteArray()
    val assetHash = sha256(indexData)
    val artifactVersion = sha256("index.html\u0000$assetHash\u0000${indexData.size}".encodeToByteArray())
    val channelUri = URI("https://cdn.example.com/hybrid/channels/production.json")
    val manifestUri = URI(
      "https://cdn.example.com/hybrid/releases/$artifactVersion/hybrid-manifest.json",
    )
    val manifest = HybridOfflineManifest(
      artifactVersion = artifactVersion,
      entrypoint = "index.html",
      files = listOf(HybridOfflineManifest.Asset("index.html", assetHash, indexData.size.toLong())),
      protocol = HybridOfflineManifest.ProtocolVersion(protocolMajor, 0),
      schemaVersion = 1,
    )
    val channel = HybridReleaseChannel(
      artifactVersion = artifactVersion,
      manifestUrl = manifestUri.toString(),
      minimumAppVersion = "1.0.0",
      releaseName = "2026.08.30.1",
      rolloutPercentage = 100,
      schemaVersion = 1,
    )
    return Fixture(
      artifactVersion,
      channelUri,
      index,
      mapOf(
        channelUri to Json.encodeToString(channel).encodeToByteArray(),
        manifestUri to Json.encodeToString(manifest).encodeToByteArray(),
        manifestUri.resolve("index.html") to if (corruptAsset) "corrupt".encodeToByteArray() else indexData,
      ),
    )
  }

  private fun sha256(data: ByteArray) = MessageDigest.getInstance("SHA-256").digest(data)
    .joinToString("") { "%02x".format(it) }

  private data class Fixture(
    val artifactVersion: String,
    val channelUri: URI,
    val index: String,
    val responses: Map<URI, ByteArray>,
  )
}
