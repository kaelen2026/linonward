import XCTest

@MainActor
final class LinOnwardUITests: XCTestCase {
  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  /// A fresh install holds no session, so sign-in is what launch shows. These
  /// cover the localized copy a first-time person actually sees; anything past
  /// the code field needs a live backend, and the rules that govern it are
  /// covered by the unit tests over `AuthenticationState`.
  func testLaunchesWithEnglishCopy() {
    let app = launch(language: "en", locale: "en_US")

    let title = app.staticTexts["signIn.title"]
    XCTAssertTrue(title.waitForExistence(timeout: 5))
    XCTAssertEqual(title.label, "Sign in")
  }

  func testLaunchesWithSimplifiedChineseCopy() {
    let app = launch(language: "zh-Hans", locale: "zh_CN")

    let title = app.staticTexts["signIn.title"]
    XCTAssertTrue(title.waitForExistence(timeout: 5))
    XCTAssertEqual(title.label, "登录")
  }

  func testHoldsSubmissionUntilTheAddressCouldReceiveMail() {
    let app = launch(language: "en", locale: "en_US")

    let submit = app.buttons["signIn.submit"]
    XCTAssertTrue(submit.waitForExistence(timeout: 5))
    XCTAssertFalse(submit.isEnabled, "nothing has been typed yet")

    let email = app.textFields["signIn.email"]
    email.tap()
    email.typeText("ada@")
    XCTAssertFalse(submit.isEnabled, "an address with no domain cannot be delivered to")

    email.typeText("example.com")
    XCTAssertTrue(submit.isEnabled)
  }

  private func launch(language: String, locale: String) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-AppleLanguages", "(\(language))", "-AppleLocale", locale]
    app.launch()
    return app
  }
}
