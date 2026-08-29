package com.linonward.app.feature.authentication

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class KeystoreSessionTokenStoreTest {
  private val context
    get() = InstrumentationRegistry.getInstrumentation().targetContext

  @Before
  @After
  fun clearPreferences() {
    context.getSharedPreferences("session", Context.MODE_PRIVATE).edit().clear().commit()
  }

  @Test
  fun tokenSurvivesStoreRecreation() {
    val first = KeystoreSessionTokenStore(context)

    assertEquals(true, first.write("session-token"))

    assertEquals("session-token", KeystoreSessionTokenStore(context).read())
  }

  @Test
  fun corruptedCiphertextIsDiscarded() {
    context
      .getSharedPreferences("session", Context.MODE_PRIVATE)
      .edit()
      .putString("session-token", "not-ciphertext")
      .commit()

    assertNull(KeystoreSessionTokenStore(context).read())
    assertNull(
      context.getSharedPreferences("session", Context.MODE_PRIVATE).getString("session-token", null)
    )
  }
}
