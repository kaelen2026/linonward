import Foundation
import Security

/// Where the session token lives between launches.
protocol SessionTokenStore: Sendable {
  func read() -> String?
  func write(_ token: String)
  func clear()
}

/// Keychain-backed storage.
///
/// The token is a bearer credential — whoever holds it is signed in — so it
/// does not belong in `UserDefaults`, which is a plain plist inside a backup.
/// `…AfterFirstUnlockThisDeviceOnly` keeps it readable to background refreshes
/// after a reboot while excluding it from backups and from restore onto another
/// device.
struct KeychainSessionTokenStore: SessionTokenStore {
  private let service: String
  private let account = "session-token"

  init(service: String = Bundle.main.bundleIdentifier ?? "com.linonward.app") {
    self.service = service
  }

  func read() -> String? {
    var query = baseQuery
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne

    var item: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
      let data = item as? Data,
      let token = String(data: data, encoding: .utf8),
      !token.isEmpty
    else { return nil }
    return token
  }

  func write(_ token: String) {
    // `SecItemAdd` refuses a duplicate and `SecItemUpdate` refuses a missing
    // item, so deleting first is what makes writing a second token idempotent.
    _ = SecItemDelete(baseQuery as CFDictionary)

    var query = baseQuery
    query[kSecValueData as String] = Data(token.utf8)
    query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    _ = SecItemAdd(query as CFDictionary, nil)
  }

  func clear() {
    _ = SecItemDelete(baseQuery as CFDictionary)
  }

  private var baseQuery: [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
  }
}
