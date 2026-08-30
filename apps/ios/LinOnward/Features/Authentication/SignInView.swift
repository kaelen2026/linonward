import SwiftUI

/// Email address, then the six-digit code sent to it.
struct SignInView: View {
  @Bindable var model: AuthenticationModel
  @Environment(\.colorScheme) private var colorScheme
  @Environment(\.webAuthenticationSession) private var webAuthenticationSession
  @FocusState private var focus: Field?

  private enum Field: Hashable {
    case email, code
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxxl) {
        BrandMark()

        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
          Text("signIn.title")
            .font(.largeTitle.bold())
            .accessibilityIdentifier("signIn.title")

          // Naming the address on the code step is what makes a typo
          // recoverable — otherwise there is nothing on screen to check it
          // against.
          Group {
            if model.state.step == .code {
              Text("signIn.subtitle.code \(model.state.email)")
            } else {
              Text("signIn.subtitle.email")
            }
          }
          .font(.callout)
          .foregroundStyle(.secondary)
        }

        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xl) {
          emailField
          if model.state.step == .code { codeField }
          if let error = model.state.error { errorMessage(error) }
          actions
        }
      }
      .frame(maxWidth: DesignTokens.Size.contentMaximumWidth, alignment: .leading)
      .padding(.horizontal, DesignTokens.Spacing.xxl)
      .padding(.vertical, DesignTokens.Spacing.xxxxl)
    }
    .scrollDismissesKeyboard(.interactively)
    .background {
      LinearGradient(
        colors: [Color.brandTeal.opacity(0.12), Color.clear],
        startPoint: .topTrailing,
        endPoint: .center
      )
      .ignoresSafeArea()
    }
    .navigationTitle("app.name")
    .navigationBarTitleDisplayMode(.inline)
    // Moving to the code step puts the caret in the code field, so the code
    // from the mail can go straight in. The email step deliberately does not
    // grab focus: throwing a keyboard over the screen on launch hides half of
    // it before anybody has asked to type.
    .task(id: model.state.step) {
      if model.state.step == .code { focus = .code }
    }
  }

  @ViewBuilder private var emailField: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
      Text("signIn.email.label")
        .font(.subheadline.weight(.medium))

      TextField("signIn.email.placeholder", text: $model.email)
        .textContentType(.emailAddress)
        .keyboardType(.emailAddress)
        .textInputAutocapitalization(.never)
        .autocorrectionDisabled()
        .disabled(model.state.step == .code || model.state.isBusy)
        .submitLabel(.next)
        .onSubmit { submit() }
        .accessibilityIdentifier("signIn.email")
        .modifier(FilledField(focus: $focus, value: .email))
    }
  }

  @ViewBuilder private var codeField: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
      Text("signIn.code.label")
        .font(.subheadline.weight(.medium))

      TextField("signIn.code.placeholder", text: $model.code)
        // `.oneTimeCode` is what puts the code from the mail above the keyboard.
        .textContentType(.oneTimeCode)
        .keyboardType(.numberPad)
        // Six digits at body size are easy to misread back. Monospaced digits
        // one step up keep the transcription checkable against the mail.
        .font(.title3.monospaced())
        .disabled(model.state.isBusy)
        .accessibilityIdentifier("signIn.code")
        .modifier(FilledField(focus: $focus, value: .code))
    }
  }

  @ViewBuilder private func errorMessage(_ error: AuthenticationError) -> some View {
    Label {
      Text(LocalizedStringKey(error.messageKey))
    } icon: {
      Image(systemName: "exclamationmark.circle.fill")
    }
    .font(.footnote)
    .foregroundStyle(destructive)
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(DesignTokens.Spacing.md)
    // A bare red line reads as a hint. The tinted panel is what marks it as the
    // reason the step did not complete.
    .background(
      destructive.opacity(0.1),
      in: .rect(cornerRadius: DesignTokens.Radius.card, style: .continuous)
    )
    // Keep the error exposed as text with a stable automation contract. Active
    // VoiceOver announcement is verified separately with assistive technology.
    .accessibilityAddTraits(.isStaticText)
    .accessibilityIdentifier("signIn.error")
    .transition(.opacity)
  }

  @ViewBuilder private var actions: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Button(action: submit) {
        // A fixed-height frame so the row does not resize when the label swaps
        // for a spinner.
        Group {
          if model.state.isBusy {
            ProgressView()
          } else {
            Text(model.state.step == .code ? "signIn.verify" : "signIn.sendCode")
              .fontWeight(.semibold)
          }
        }
        .frame(maxWidth: .infinity, minHeight: 24)
      }
      .buttonStyle(.borderedProminent)
      .controlSize(.large)
      // The default capsule fights the rounded rectangles above it.
      .buttonBorderShape(.roundedRectangle(radius: DesignTokens.Radius.card))
      .disabled(model.state.step == .code ? !model.state.canVerifyCode : !model.state.canSendCode)
      .accessibilityIdentifier("signIn.submit")

      if model.state.step == .code {
        Button("signIn.changeEmail") { model.editEmail() }
          .font(.footnote)
          .disabled(model.state.isBusy)
          .accessibilityIdentifier("signIn.changeEmail")
      }

      // Only alongside the email step. On the code step a second route out
      // would abandon a code that has already been sent and paid for.
      if model.state.step == .email && model.isGoogleAvailable { google }
    }
  }

  @ViewBuilder private var google: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      HStack(spacing: DesignTokens.Spacing.md) {
        rule
        Text("signIn.or")
          .font(.footnote)
          .foregroundStyle(.secondary)
        rule
      }
      // One separator drawn as three views is decoration, and reading it out
      // would put "or" between two anonymous images.
      .accessibilityHidden(true)

      // No glyph: Google's brand terms govern the mark that may sit beside this
      // label, and a stand-in SF Symbol would misattribute the provider.
      Button(action: signInWithGoogle) {
        Text("signIn.google")
          .frame(maxWidth: .infinity, minHeight: 24)
      }
      .buttonStyle(.bordered)
      .controlSize(.large)
      .buttonBorderShape(.roundedRectangle(radius: DesignTokens.Radius.card))
      .disabled(model.state.isBusy)
      .accessibilityIdentifier("signIn.google")
    }
  }

  private var rule: some View {
    Rectangle()
      .frame(height: 1)
      .foregroundStyle(.quaternary)
  }

  /// The ramp ships both steps because `destructiveLight` is too dense to read
  /// on a dark surface.
  private var destructive: Color {
    colorScheme == .dark ? .destructiveDark : .destructiveLight
  }

  private func submit() {
    Task {
      if model.state.step == .code {
        await model.verifyCode()
      } else if model.state.canSendCode {
        await model.sendVerificationCode()
      }
    }
  }

  private func signInWithGoogle() {
    let browser = SystemWebAuthenticationBrowser(session: webAuthenticationSession)
    Task { await model.signInWithGoogle(presentedBy: browser) }
  }
}

/// A filled field rather than `.roundedBorder`. The bordered style draws a
/// hairline that all but vanishes over this screen's tinted background, and it
/// has no way to show focus; the fill plus an accent ring is what says which of
/// the two fields is taking keystrokes.
private struct FilledField<Value: Hashable>: ViewModifier {
  @FocusState.Binding var focus: Value?

  let value: Value

  private var isFocused: Bool { focus == value }

  func body(content: Content) -> some View {
    content
      .focused($focus, equals: value)
      .padding(.horizontal, DesignTokens.Spacing.lg)
      .padding(.vertical, DesignTokens.Spacing.md)
      .background(
        Color(.secondarySystemBackground),
        in: .rect(cornerRadius: DesignTokens.Radius.card, style: .continuous)
      )
      .overlay {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.card, style: .continuous)
          .strokeBorder(
            isFocused ? Color.accentColor : Color(.separator),
            lineWidth: isFocused ? 2 : 0.5
          )
      }
      // The padding and fill sit outside the `TextField`, so without these the
      // visible chrome swallows the tap instead of focusing the field — a band
      // of dead pixels all the way round what looks like an input.
      .contentShape(.rect)
      .onTapGesture { focus = value }
      .animation(.easeOut(duration: 0.15), value: isFocused)
  }
}

#Preview("Email") {
  NavigationStack {
    SignInView(model: .previewAwaitingEmail())
  }
}

#Preview("Email · no Google in this build") {
  NavigationStack {
    SignInView(model: .previewAwaitingEmail(google: false))
  }
}

#Preview("Code") {
  NavigationStack {
    SignInView(model: .previewAwaitingCode())
  }
}

#Preview("Wrong code") {
  NavigationStack {
    SignInView(model: .previewShowingError(.invalidCode))
  }
}

#Preview("简体中文 · Dark") {
  NavigationStack {
    SignInView(model: .previewAwaitingCode())
  }
  .environment(\.locale, Locale(identifier: "zh-Hans"))
  .preferredColorScheme(.dark)
}
