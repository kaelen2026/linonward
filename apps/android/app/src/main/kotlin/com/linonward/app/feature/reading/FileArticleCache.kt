package com.linonward.app.feature.reading

import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class FileArticleCache(private val cacheDirectory: File) : ArticleCache {
  private val json = Json { ignoreUnknownKeys = true }

  override suspend fun load(locale: String): List<ReaderArticle>? = withContext(Dispatchers.IO) {
    val snapshot = snapshotFile(locale)
    if (!snapshot.isFile) return@withContext null
    json.decodeFromString<List<ReaderArticle>>(snapshot.readText())
  }

  override suspend fun save(locale: String, articles: List<ReaderArticle>) =
    withContext(Dispatchers.IO) {
      val snapshot = snapshotFile(locale)
      snapshot.parentFile?.mkdirs()
      val temporary = File(snapshot.parentFile, ".${snapshot.name}.tmp")
      try {
        temporary.writeText(json.encodeToString(articles))
        Files.move(
          temporary.toPath(),
          snapshot.toPath(),
          StandardCopyOption.ATOMIC_MOVE,
          StandardCopyOption.REPLACE_EXISTING,
        )
        Unit
      } finally {
        temporary.delete()
      }
    }

  private fun snapshotFile(locale: String) =
    File(File(cacheDirectory, "articles"), "${localeCode(locale)}.json")
}
