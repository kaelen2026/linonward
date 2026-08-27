import SwiftUI

/// Email address, then the six-digit code sent to it.
struct SignInView: View {
  @Bindable var model: AuthenticationModel
  @FocusState private var focus: Field?

  private enum Field: Hashable {
    case email, code
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 28) {
        BrandMark()

        VStack(alignment: .leading, spacing: 8) {
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

        VStack(alignment: .leading, spacing: 20) {
          emailField
          if model.state.step == .code { codeField }
          if let error = model.state.error { errorMessage(error) }
          actions
        }
      }
      .frame(maxWidth: 560, alignment: .leading)
      .padding(.horizontal, 24)
      .padding(.vertical, 40)
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
    VStack(alignment: .leading, spacing: 6) {
      Text("signIn.email.label")
        .font(.subheadline.weight(.medium))

      TextField("signIn.email.placeholder", text: $model.email)
        .textFieldStyle(.roundedBorder)
        .textContentType(.emailAddress)
        .keyboardType(.emailAddress)
        .textInputAutocapitalization(.never)
        .autocorrectionDisabled()
        .focused($focus, equals: .email)
        .disabled(model.state.step == .code || model.state.isBusy)
        .submitLabel(.next)
        .onSubmit { submit() }
        .accessibilityIdentifier("signIn.email")
    }
  }

  @ViewBuilder private var codeField: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("signIn.code.label")
        .font(.subheadline.weight(.medium))

      TextField("signIn.code.placeholder", text: $model.code)
        .textFieldStyle(.roundedBorder)
        // `.oneTimeCode` is what puts the code from the mail above the keyboard.
        .textContentType(.oneTimeCode)
        .keyboardType(.numberPad)
        .monospaced()
        .focused($focus, equals: .code)
        .disabled(model.state.isBusy)
        .accessibilityIdentifier("signIn.code")
    }
  }

  @ViewBuilder private func errorMessage(_ error: AuthenticationError) -> some View {
    Label {
      Text(LocalizedStringKey(error.messageKey))
    } icon: {
      Image(systemName: "exclamationmark.circle.fill")
    }
    .font(.footnote)
    .foregroundStyle(.red)
    // VoiceOver announces the failure as it appears instead of leaving it to be
    // discovered by swiping.
    .accessibilityAddTraits(.isStaticText)
    .accessibilityIdentifier("signIn.error")
    .transition(.opacity)
  }

  @ViewBuilder private var actions: some View {
    VStack(alignment: .leading, spacing: 12) {
      Button(action: submit) {
        // A fixed-height frame so the row does not resize when the label swaps
        // for a spinner.
        Group {
          if model.state.isBusy {
            ProgressView()
          } else {
            Text(model.state.step == .code ? "signIn.verify" : "signIn.sendCode")
          }
        }
        .frame(maxWidth: .infinity, minHeight: 24)
      }
      .buttonStyle(.borderedProminent)
      .controlSize(.large)
      .disabled(model.state.step == .code ? !model.state.canVerifyCode : !model.state.canSendCode)
      .accessibilityIdentifier("signIn.submit")

      if model.state.step == .code {
        Button("signIn.changeEmail") { model.editEmail() }
          .font(.footnote)
          .disabled(model.state.isBusy)
          .accessibilityIdentifier("signIn.changeEmail")
      }
    }
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
}

#Preview("Email") {
  NavigationStack {
    SignInView(model: .previewAwaitingEmail())
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
