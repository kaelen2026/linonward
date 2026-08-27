import Foundation

/// The signed-in person, as the API reports them.
///
/// Only the fields the app actually renders are decoded. Better Auth returns a
/// wider user record, and pulling all of it in would turn every backend field
/// addition into an iOS decoding concern.
struct AuthenticatedUser: Equatable, Sendable {
  let id: String
  let email: String
  let name: String
}

extension AuthenticatedUser: Decodable {
  private enum CodingKeys: String, CodingKey {
    case id, email, name
  }

  init(from decoder: any Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decode(String.self, forKey: .id)
    email = try container.decode(String.self, forKey: .email)
    // Better Auth leaves `name` empty for an account created by email OTP, and
    // omits it entirely on some providers. Falling back to the email keeps the
    // greeting addressed to somebody rather than to an empty string.
    let name = try container.decodeIfPresent(String.self, forKey: .name) ?? ""
    self.name = name.isEmpty ? email : name
  }
}

/// `GET /api/auth/get-session`, which answers `null` rather than 401 when no
/// session is attached.
struct SessionPayload: Decodable, Sendable {
  let user: AuthenticatedUser
}

/// `POST /api/auth/sign-in/email-otp`.
struct SignInPayload: Decodable, Sendable {
  let token: String?
  let user: AuthenticatedUser
}

/// Better Auth's error envelope. Both fields are optional because an error
/// raised before the plugin stack — a proxy, say — will not follow the shape.
struct AuthenticationFailurePayload: Decodable, Sendable {
  let code: String?
  let message: String?
}
