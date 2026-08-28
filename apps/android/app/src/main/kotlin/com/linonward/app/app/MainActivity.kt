package com.linonward.app.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.linonward.app.designsystem.LinOnwardTheme

/**
 * The app's single activity.
 *
 * It holds no state and makes no decisions: everything the app does is Compose below
 * [LinOnwardApp]. The manifest declares `configChanges` for rotation and dark-mode switches, so the
 * activity is not recreated for either and the composition keeps what the person typed.
 */
class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    setContent { LinOnwardTheme { LinOnwardApp() } }
  }
}
