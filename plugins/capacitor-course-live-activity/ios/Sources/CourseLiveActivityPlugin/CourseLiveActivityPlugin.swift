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

    /// A best-effort safety net while the app process is still running. The
    /// JavaScript scheduler also ends the activity on every resume, so a
    /// suspended process cannot leave an already finished course visible when
    /// the app becomes active again.
    #if canImport(ActivityKit)
    private var automaticEndIds = Set<String>()
    #endif

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
        automaticEndIds.remove(id)
        #endif

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
        automaticEndIds.removeAll()
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

        // Do not recreate an activity from cached data after its course has
        // already finished. This also closes a race with the web scheduler at
        // the exact end time.
        guard payload.state.endTime > Date() else {
            automaticEndIds.remove(payload.id)
            Task {
                for activity in Activity<CourseLectureAttributes>.activities where activity.attributes.id == payload.id {
                    await activity.end(using: nil, dismissalPolicy: .immediate)
                }
                call.resolve()
            }
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

                scheduleAutomaticEnd(for: payload)

                call.resolve()
            } catch {
                call.reject("Unable to update Live Activity", nil, error)
            }
        }
        #else
        call.resolve()
        #endif
    }

    @available(iOS 16.1, *)
    private func scheduleAutomaticEnd(for payload: (id: String, state: CourseLectureAttributes.ContentState)) {
        // `Text(timerInterval:pauseTime:)` keeps the countdown at zero even
        // when iOS suspends the app. This task removes the whole activity on
        // time whenever the process is allowed to run (for example while the
        // app is foregrounded).
        guard automaticEndIds.insert(payload.id).inserted else { return }
        let delay = payload.state.endTime.timeIntervalSinceNow
        guard delay > 0 else { return }

        Task {
            let nanoseconds = UInt64(delay * 1_000_000_000)
            try? await Task.sleep(nanoseconds: nanoseconds)
            guard !Task.isCancelled else { return }
            for activity in Activity<CourseLectureAttributes>.activities where activity.attributes.id == payload.id {
                await activity.end(using: nil, dismissalPolicy: .immediate)
            }
        }
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
