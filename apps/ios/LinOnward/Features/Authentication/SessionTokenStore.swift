import Foundation
import Security

/// Where the session token lives between launches.
protocol SessionTokenStore: Sendable {
  func read() throws -> String?
  func write(_ token: String) throws
  func clear() throws
}

enum SessionTokenStoreError: Error, Equatable, Sendable {
  case unavailable
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

  func read() throws -> String? {
    var query = baseQuery
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne

    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess,
      let data = item as? Data,
      let token = String(data: data, encoding: .utf8),
      !token.isEmpty
    else { throw SessionTokenStoreError.unavailable }
    return token
  }

  func write(_ token: String) throws {
    let attributes: [String: Any] = [kSecValueData as String: Data(token.utf8)]
    let updateStatus = SecItemUpdate(baseQuery as CFDictionary, attributes as CFDictionary)
    if updateStatus == errSecSuccess { return }
    guard updateStatus == errSecItemNotFound else { throw SessionTokenStoreError.unavailable }

    var item = baseQuery
    item.merge(attributes) { _, new in new }
    item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else {
      throw SessionTokenStoreError.unavailable
    }
  }

  func clear() throws {
    let status = SecItemDelete(baseQuery as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else {
      throw SessionTokenStoreError.unavailable
    }
  }

  private var baseQuery: [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
  }
}
