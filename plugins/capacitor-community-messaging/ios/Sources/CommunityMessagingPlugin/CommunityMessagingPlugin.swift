import Capacitor
import FirebaseCore
import FirebaseMessaging
import Foundation
import UIKit
import UserNotifications

@objc(CommunityMessagingPlugin)
public class CommunityMessagingPlugin: CAPPlugin, CAPBridgedPlugin, MessagingDelegate {
    public let identifier = "CommunityMessagingPlugin"
    public let jsName = "CommunityMessaging"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "register", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getInitialNotification", returnType: CAPPluginReturnPromise)
    ]

    private let notificationHandler = CommunityMessagingHandler()

    override public func load() {
        notificationHandler.plugin = self
        bridge?.notificationRouter.pushNotificationHandler = notificationHandler

        if FirebaseApp.app() == nil,
           Bundle.main.url(forResource: "GoogleService-Info", withExtension: "plist") != nil {
            FirebaseApp.configure()
        }
        if firebaseConfigured {
            Messaging.messaging().isAutoInitEnabled = false
            Messaging.messaging().delegate = self
        }
    }

    @objc func checkPermission(_ call: CAPPluginCall) {
        resolvePermission(call)
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { _, error in
            if let error {
                call.reject("Unable to request notification permission", nil, error)
                return
            }
            self.resolvePermission(call)
        }
    }

    @objc func register(_ call: CAPPluginCall) {
        guard firebaseConfigured else {
            call.reject("Firebase Messaging is not configured for this iOS build")
            return
        }
        Messaging.messaging().isAutoInitEnabled = true
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
            call.resolve()
        }
    }

    @objc func getToken(_ call: CAPPluginCall) {
        guard firebaseConfigured else {
            call.reject("Firebase Messaging is not configured for this iOS build")
            return
        }
        Messaging.messaging().token { token, error in
            if let error {
                call.reject("Unable to obtain Firebase Messaging token", nil, error)
                return
            }
            call.resolve(["token": token ?? NSNull()])
        }
    }

    @objc func deleteToken(_ call: CAPPluginCall) {
        guard firebaseConfigured else {
            call.reject("Firebase Messaging is not configured for this iOS build")
            return
        }
        Messaging.messaging().deleteToken { error in
            if let error {
                call.reject("Unable to delete Firebase Messaging token", nil, error)
                return
            }
            Messaging.messaging().isAutoInitEnabled = false
            DispatchQueue.main.async {
                UIApplication.shared.unregisterForRemoteNotifications()
                call.resolve()
            }
        }
    }

    @objc func getInitialNotification(_ call: CAPPluginCall) {
        notificationHandler.initialNotificationConsumed = true
        call.resolve(["notification": CommunityMessagingHandler.takeInitial() ?? NSNull()])
    }

    public func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken, !fcmToken.isEmpty else { return }
        notifyListeners("tokenReceived", data: ["token": fcmToken], retainUntilConsumed: true)
    }

    func notifyReceived(_ notification: JSObject) {
        notifyListeners("notificationReceived", data: notification, retainUntilConsumed: true)
    }

    func notifyAction(_ notification: JSObject, actionId: String) {
        notifyListeners(
            "notificationActionPerformed",
            data: ["notification": notification, "actionId": actionId],
            retainUntilConsumed: true
        )
    }

    private var firebaseConfigured: Bool {
        FirebaseApp.app() != nil
    }

    private func resolvePermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let state: String
            switch settings.authorizationStatus {
            case .authorized, .ephemeral, .provisional:
                state = "granted"
            case .denied:
                state = "denied"
            case .notDetermined:
                state = "prompt"
            @unknown default:
                state = "prompt"
            }
            call.resolve(["receive": state])
        }
    }
}
