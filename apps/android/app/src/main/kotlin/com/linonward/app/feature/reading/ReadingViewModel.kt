package com.linonward.app.feature.reading

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import java.util.Locale
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface ReadingState {
  data object Loading : ReadingState
  data class Loaded(val articles: List<ReaderArticle>) : ReadingState
  data object Failed : ReadingState
}

class ReadingViewModel(private val service: ArticleService) : ViewModel() {
  private val mutableState = MutableStateFlow<ReadingState>(ReadingState.Loading)
  val state: StateFlow<ReadingState> = mutableState.asStateFlow()

  fun load(locale: Locale = Locale.getDefault()) {
    if (mutableState.value == ReadingState.Loading && loadStarted) return
    loadStarted = true
    mutableState.value = ReadingState.Loading
    viewModelScope.launch {
      mutableState.value = runCatching { service.articles(locale.toLanguageTag()) }
        .fold(
          onSuccess = { ReadingState.Loaded(it) },
          onFailure = { ReadingState.Failed },
        )
    }
  }

  private var loadStarted = false

  companion object {
    val Factory = viewModelFactory {
      initializer {
        val application = checkNotNull(
          this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY],
        )
        ReadingViewModel(
          OfflineArticleService(
            remote = LiveArticleService(),
            cache = FileArticleCache(application.cacheDir),
          ),
        )
      }
    }
  }
}
