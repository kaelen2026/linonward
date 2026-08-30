package com.linonward.app.feature.reading

import kotlinx.serialization.Serializable

@Serializable
data class ReaderArticle(
  val author: String?,
  val contentHtml: String,
  val cover: ReaderArticleImage?,
  val id: String,
  val publishedAt: String?,
  val readingMinutes: Int?,
  val title: String,
)

@Serializable
data class ReaderArticleImage(
  val alt: String,
  val caption: String?,
  val url: String,
)
