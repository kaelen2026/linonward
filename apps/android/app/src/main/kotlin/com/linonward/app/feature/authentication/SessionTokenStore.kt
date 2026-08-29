package com.linonward.app.feature.authentication

import android.annotation.SuppressLint
import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.core.content.edit
import java.security.KeyStore
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Where the session token lives between launches. */
interface SessionTokenStore {
  fun read(): String?

  /** Returns whether the credential was durably persisted. */
  fun write(token: String): Boolean

  fun clear()
}

/**
 * Preferences, with the token encrypted under a key the app never sees.
 *
 * The token is a bearer credential — whoever holds it is signed in — so it does not belong in a
 * plain preferences file, which is readable from a rooted device and, on some OEM builds, from a
 * cloud backup. The key is generated inside the Android Keystore and never leaves it, so a copy of
 * the preferences file off the device decrypts to nothing.
 *
 * `allowBackup="false"` in the manifest is the other half: a Keystore key is not backed up, so a
 * restored preferences file would carry ciphertext nothing on the new device can read.
 */
class KeystoreSessionTokenStore(context: Context) : SessionTokenStore {
  private val preferences =
    context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

  override fun read(): String? {
    val stored = preferences.getString(TOKEN, null) ?: return null
    // A key can disappear under the app — a lock-screen change or a restore
    // invalidates the Keystore entry — which leaves ciphertext that will never
    // decrypt. That reads as "not signed in", not as a crash on launch.
    return runCatching { decrypt(stored) }
      .getOrElse {
        clear()
        null
      }
      ?.ifEmpty { null }
  }

  @SuppressLint("UseKtx") // KTX edit returns Unit; the caller needs commit's durability result.
  override fun write(token: String): Boolean {
    val encrypted = runCatching { encrypt(token) }.getOrNull() ?: return false
    return preferences.edit().putString(TOKEN, encrypted).commit()
  }

  override fun clear() {
    preferences.edit { remove(TOKEN) }
  }

  private fun encrypt(value: String): String {
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.ENCRYPT_MODE, secretKey())
    val ciphertext = cipher.doFinal(value.toByteArray())
    // The IV is generated per encryption and is not a secret; it has to travel
    // with the ciphertext or the next launch cannot decrypt it.
    return "${cipher.iv.encoded()}:${ciphertext.encoded()}"
  }

  private fun decrypt(value: String): String {
    val (iv, ciphertext) = value.split(":").also { require(it.size == 2) }
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(TAG_BITS, iv.decoded()))
    return String(cipher.doFinal(ciphertext.decoded()))
  }

  private fun secretKey(): SecretKey {
    val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
    (keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry)?.let {
      return it.secretKey
    }

    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE)
    generator.init(
      KeyGenParameterSpec.Builder(
          KEY_ALIAS,
          KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .build()
    )
    return generator.generateKey()
  }

  private fun ByteArray.encoded(): String = Base64.getEncoder().encodeToString(this)

  private fun String.decoded(): ByteArray = Base64.getDecoder().decode(this)

  private companion object {
    const val KEYSTORE = "AndroidKeyStore"
    const val KEY_ALIAS = "com.linonward.app.session"
    const val TRANSFORMATION = "AES/GCM/NoPadding"
    const val TAG_BITS = 128
    const val PREFERENCES = "session"
    const val TOKEN = "session-token"
  }
}
