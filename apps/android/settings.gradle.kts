// `apps/android` is its own Gradle build, not a member of the pnpm workspace.
// Turborepo owns the JavaScript task graph; Gradle owns this one, exactly as
// XcodeGen owns `apps/ios`.
pluginManagement {
  repositories {
    google {
      content {
        includeGroupByRegex("com\\.android.*")
        includeGroupByRegex("com\\.google.*")
        includeGroupByRegex("androidx.*")
      }
    }
    mavenCentral()
    gradlePluginPortal()
  }
}

plugins {
  // Lets Gradle auto-provision the JDK required by the checked-in Daemon criteria.
  id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

dependencyResolutionManagement {
  // A project-local repository declaration is a mistake here, not a fallback:
  // it would resolve a dependency this file never listed.
  repositoriesMode = RepositoriesMode.FAIL_ON_PROJECT_REPOS
  repositories {
    google()
    mavenCentral()
  }
}

rootProject.name = "LinOnward"

include(":app")
