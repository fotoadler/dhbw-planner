import Foundation
import Capacitor

#if canImport(ActivityKit)
import ActivityKit
#endif

@objc(CourseLiveActivityPlugin)
public class CourseLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CourseLiveActivityPlugin"
    public let jsName = "CourseLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endAll", returnType: CAPPluginReturnPromise)
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
            let enabled = ActivityAuthorizationInfo().areActivitiesEnabled
            call.resolve([
                "available": enabled,
                "platform": "ios",
                "reason": enabled ? "" : "Live Activities are disabled for this app."
            ])
            return
        }
        #endif

        call.resolve([
            "available": false,
            "platform": "ios",
            "reason": "Live Activities require iOS 16.1 or later."
        ])
    }

    @objc func start(_ call: CAPPluginCall) {
        upsert(call)
    }

    @objc func update(_ call: CAPPluginCall) {
        upsert(call)
    }

    @objc func end(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty else {
            call.reject("Missing id")
            return
        }

        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
            Task {
                for activity in Activity<CourseLectureAttributes>.activities where activity.attributes.id == id {
                    await activity.end(using: nil, dismissalPolicy: .immediate)
                }
                call.resolve()
            }
            return
        }
        #endif

        call.resolve()
    }

    @objc func endAll(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
            Task {
                for activity in Activity<CourseLectureAttributes>.activities {
                    await activity.end(using: nil, dismissalPolicy: .immediate)
                }
                call.resolve()
            }
            return
        }
        #endif

        call.resolve()
    }

    private func upsert(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        guard #available(iOS 16.1, *) else {
            call.resolve()
            return
        }

        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.reject("Live Activities are disabled for this app.")
            return
        }

        guard let payload = makePayload(call) else {
            call.reject("Missing id, title, startTime or endTime")
            return
        }

        Task {
            do {
                if let existing = Activity<CourseLectureAttributes>.activities.first(where: { $0.attributes.id == payload.id }) {
                    await existing.update(using: payload.state)
                } else {
                    _ = try Activity.request(
                        attributes: CourseLectureAttributes(id: payload.id),
                        contentState: payload.state,
                        pushType: nil
                    )
                }

                for activity in Activity<CourseLectureAttributes>.activities where activity.attributes.id != payload.id {
                    await activity.end(using: nil, dismissalPolicy: .immediate)
                }

                call.resolve()
            } catch {
                call.reject("Unable to update Live Activity", nil, error)
            }
        }
        #else
        call.resolve()
        #endif
    }

    #if canImport(ActivityKit)
    @available(iOS 16.1, *)
    private func makePayload(_ call: CAPPluginCall) -> (id: String, state: CourseLectureAttributes.ContentState)? {
        guard
            let id = call.getString("id"), !id.isEmpty,
            let title = call.getString("title"), !title.isEmpty,
            let startMs = call.getDouble("startTime"),
            let endMs = call.getDouble("endTime")
        else {
            return nil
        }

        let nextStartMs = call.getDouble("nextStartTime")
        let state = CourseLectureAttributes.ContentState(
            title: title,
            room: call.getString("room") ?? "",
            lecturer: call.getString("lecturer") ?? "",
            startTime: Date(timeIntervalSince1970: startMs / 1000),
            endTime: Date(timeIntervalSince1970: endMs / 1000),
            nextTitle: call.getString("nextTitle") ?? "",
            nextStartTime: nextStartMs.map { Date(timeIntervalSince1970: $0 / 1000) }
        )

        return (id, state)
    }
    #endif
}
