import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
  alias(libs.plugins.android.application)
  alias(libs.plugins.kotlin.compose)
  alias(libs.plugins.kotlin.serialization)
}

/**
 * The API origin baked into this build.
 *
 * One origin per build, chosen at build time and never guessed at runtime —
 * the same contract as `LINONWARD_API_BASE_URL` in `apps/ios`. A release
 * inherits nothing: `linonward.apiBaseUrl.release` is empty in
 * `gradle.properties`, so a release nobody configured fails visibly on the
 * sign-in screen instead of quietly reaching for a loopback address that
 * belongs to the phone it is installed on. Override per build with
 * `-Plinonward.apiBaseUrl.release=https://api.example.com`.
 */
fun apiBaseUrl(buildType: String): String =
  providers.gradleProperty("linonward.apiBaseUrl.$buildType").orNull.orEmpty()

android {
  namespace = "com.linonward.app"
  compileSdk = 37
  // Android 37 ships minor platform releases; AndroidX requires 37 or later.
  compileSdkMinor = 1

  defaultConfig {
    applicationId = "com.linonward.app"
    minSdk = 26
    targetSdk = 37
    versionCode = 1
    versionName = "1.0"
  }

  androidResources {
    // Keeps the two languages the app is actually translated into, and drops
    // the dozens that AndroidX libraries drag in — a device set to Japanese
    // would otherwise show a Material string in Japanese beside the app's own
    // English.
    localeFilters += setOf("en", "zh")
  }

  buildFeatures {
    compose = true
    // Off by default since AGP 8. The app reads its API origin from
    // BuildConfig, which is the Android half of the one-origin-per-build
    // contract above.
    buildConfig = true
  }

  buildTypes {
    debug {
      applicationIdSuffix = ".debug"
      buildConfigField("String", "API_BASE_URL", "\"${apiBaseUrl("debug")}\"")
    }
    release {
      isMinifyEnabled = true
      isShrinkResources = true
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
      buildConfigField("String", "API_BASE_URL", "\"${apiBaseUrl("release")}\"")
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  lint {
    // The same stance as `allWarningsAsErrors` below and Biome at the root: a
    // lint warning is a defect that has not happened yet, and a list of them
    // nobody reads is worse than no list.
    warningsAsErrors = true
    abortOnError = true
  }
}

kotlin {
  compilerOptions {
    jvmTarget = JvmTarget.JVM_17
    // Warnings are how a deprecated API or an unchecked cast announces itself
    // one release before it breaks; letting them accumulate is how they get
    // missed.
    allWarningsAsErrors = true
  }
}

dependencies {
  implementation(libs.androidx.core.ktx)
  implementation(libs.androidx.activity.compose)
  implementation(libs.androidx.lifecycle.runtime.compose)
  implementation(libs.androidx.lifecycle.viewmodel.compose)
  implementation(libs.kotlinx.serialization.json)

  val composeBom = platform(libs.androidx.compose.bom)
  implementation(composeBom)
  implementation(libs.androidx.compose.material3)
  implementation(libs.androidx.compose.ui)
  implementation(libs.androidx.compose.ui.tooling.preview)
  debugImplementation(libs.androidx.compose.ui.tooling)

  testImplementation(libs.junit)
  testImplementation(libs.kotlinx.coroutines.test)
}
