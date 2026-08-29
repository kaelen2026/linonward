package com.linonward.app.feature.authentication

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.linonward.app.R
import com.linonward.app.designsystem.LinOnwardTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class SignInScreenTest {
  @get:Rule val compose = createComposeRule()

  private val context
    get() = InstrumentationRegistry.getInstrumentation().targetContext

  @Test
  fun invalidEmailCannotRequestCode() {
    show(AuthenticationState().signedOut().withEmail("not-an-email"))

    compose.onNodeWithText(context.getString(R.string.sign_in_send_code)).assertIsNotEnabled()
  }

  @Test
  fun validEmailCanRequestCode() {
    show(AuthenticationState().signedOut().withEmail("ada@example.com"))

    compose.onNodeWithText(context.getString(R.string.sign_in_send_code)).assertIsEnabled()
  }

  @Test
  fun pastedCodeIsReducedToSixDigits() {
    var state by mutableStateOf(
      AuthenticationState().signedOut().withEmail("ada@example.com").codeSent()
    )
    compose.setContent {
      LinOnwardTheme {
        SignInScreen(
          state = state,
          onEmailChange = { state = state.withEmail(it) },
          onCodeChange = { state = state.withCode(it) },
          onSubmit = {},
          onEditEmail = {},
        )
      }
    }

    compose
      .onNodeWithText(context.getString(R.string.sign_in_code_placeholder))
      .performTextInput("12-34 5678")

    compose.onNodeWithText("123456").assertTextContains("123456")
  }

  private fun show(state: AuthenticationState) {
    compose.setContent {
      LinOnwardTheme {
        SignInScreen(
          state = state,
          onEmailChange = {},
          onCodeChange = {},
          onSubmit = {},
          onEditEmail = {},
        )
      }
    }
    compose.onNodeWithText(context.getString(R.string.sign_in_title)).assertIsDisplayed()
  }
}
