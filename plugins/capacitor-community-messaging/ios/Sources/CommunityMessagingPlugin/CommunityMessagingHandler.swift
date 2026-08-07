import Capacitor
import Foundation
import UserNotifications

final class CommunityMessagingHandler: NSObject, NotificationHandlerProtocol {
    weak var plugin: CommunityMessagingPlugin?
    var initialNotificationConsumed = false

    func willPresent(notification: UNNotification) -> UNNotificationPresentationOptions {
        let payload = Self.payload(from: notification.request.content)
        plugin?.notifyReceived(payload)
        return [.banner, .list, .sound]
    }

    func didReceive(response: UNNotificationResponse) {
        let payload = Self.payload(from: response.notification.request.content)
        if !initialNotificationConsumed {
            Self.persistInitial(payload)
        }
        plugin?.notifyAction(payload, actionId: response.actionIdentifier)
    }

    static func takeInitial() -> JSObject? {
        defer { UserDefaults.standard.removeObject(forKey: initialNotificationKey) }
        guard
            let data = UserDefaults.standard.data(forKey: initialNotificationKey),
            let object = try? JSONSerialization.jsonObject(with: data) as? JSObject
        else {
            return nil
        }
        return object
    }

    private static let initialNotificationKey = "dhbw.communityMessaging.initialNotification"

    private static func persistInitial(_ payload: JSObject) {
        guard let data = try? JSONSerialization.data(withJSONObject: payload) else { return }
        UserDefaults.standard.set(data, forKey: initialNotificationKey)
    }

    private static func payload(from content: UNNotificationContent) -> JSObject {
        var data: JSObject = [:]
        for (key, value) in content.userInfo {
            let stringKey = String(describing: key)
            guard !isInternalKey(stringKey) else { continue }
            if let string = value as? String {
                data[stringKey] = string
            } else if let number = value as? NSNumber {
                data[stringKey] = number.stringValue
            }
        }

        return [
            "id": content.userInfo["gcm.message_id"] as? String ?? "",
            "title": content.title,
            "body": content.body,
            "data": data
        ]
    }

    private static func isInternalKey(_ key: String) -> Bool {
        key.hasPrefix("google.") || key.hasPrefix("gcm.") || key == "aps"
    }
}
