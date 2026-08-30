package com.linonward.app.feature.reading

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.linonward.app.R

@Composable
fun ReadingScreen(
  onArticleSelected: (ReaderArticle) -> Unit,
  onClose: () -> Unit,
  modifier: Modifier = Modifier,
  viewModel: ReadingViewModel = viewModel(factory = ReadingViewModel.Factory),
) {
  val state by viewModel.state.collectAsStateWithLifecycle()
  LaunchedEffect(Unit) { viewModel.load() }

  Column(modifier = modifier.fillMaxSize()) {
    TextButton(onClick = onClose) { Text(stringResource(R.string.common_back)) }
    when (val current = state) {
      ReadingState.Loading -> Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
      ) {
        CircularProgressIndicator()
        Text(stringResource(R.string.reading_loading), modifier = Modifier.padding(top = 12.dp))
      }
      ReadingState.Failed -> Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
      ) {
        Text(stringResource(R.string.reading_error))
        TextButton(onClick = viewModel::load) { Text(stringResource(R.string.reading_retry)) }
      }
      is ReadingState.Loaded -> if (current.articles.isEmpty()) {
        Text(stringResource(R.string.reading_empty), modifier = Modifier.padding(24.dp))
      } else {
        LazyColumn(contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)) {
          items(current.articles, key = ReaderArticle::id) { article ->
            Column(
              modifier = Modifier.fillMaxWidth().clickable { onArticleSelected(article) }
                .padding(horizontal = 8.dp, vertical = 16.dp),
              verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
              Text(article.title, style = MaterialTheme.typography.titleLarge)
              article.author?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium,
                  color = MaterialTheme.colorScheme.onSurfaceVariant)
              }
            }
          }
        }
      }
    }
  }
}
