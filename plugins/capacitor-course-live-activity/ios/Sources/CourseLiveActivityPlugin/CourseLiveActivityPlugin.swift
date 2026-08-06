import Foundation
import Capacitor

#if canImport(ActivityKit)
import ActivityKit

@available(iOS 16.1, *)
private actor CourseLiveActivityController {
    private static let issuedActivitiesKey = "de.dhbw.raplaplan.liveActivity.issued.v1"

    /// A course Activity is requested only once. This is deliberately stored
    /// across app launches: if someone dismisses it on the Lock Screen,
    /// `Activity.activities` no longer contains it and requesting it again
    /// would make the dismissed UI reappear.
    private var issuedActivities = CourseLiveActivityController.loadIssuedActivities()
    private var automaticEndTasks: [String: Task<Void, Never>] = [:]

    func upsert(id: String, state: CourseLectureAttributes.ContentState) async throws {
        pruneIssuedActivities()

        guard state.endTime > Date() else {
            await end(id: id)
            return
        }

        let currentActivities = Activity<CourseLectureAttributes>.activities
        if let existing = currentActivities.first(where: { $0.attributes.id == id }) {
            // A previous version could create more than one Activity for the
            // same course during concurrent bridge calls. Keep one and clean
            // up every other Activity, including same-ID duplicates.
            await endDuplicateActivities(for: id, keeping: existing.id)

            var isUpdateable = existing.activityState == .active
            if #available(iOS 16.2, *) {
                isUpdateable = isUpdateable || existing.activityState == .stale
            }
            if isUpdateable {
                if !hasSameContent(existing, as: state) {
                    await update(existing, with: state)
                }
                await endOtherActivities(except: id)
                scheduleAutomaticEnd(id: id, state: state)
                return
            }

            // Ended, dismissed, or a future lifecycle state: never request a
            // replacement for the same course.
            recordIssuedActivity(id: id, through: state.endTime)
            await endOtherActivities(except: id)
            return
        }

        // Never recreate a course Activity that this app already issued. The
        // missing Activity is normally the result of a user dismissal.
        guard !wasIssued(id: id) else {
            await endOtherActivities(except: id)
            return
        }

        await endOtherActivities(except: id)
        let activity = try request(id: id, state: state)
        recordIssuedActivity(id: id, through: state.endTime)
        scheduleAutomaticEnd(id: id, state: state)
        observe(activity)
    }

    /// iOS 26 can start a Live Activity at a precise future time even while
    /// the app is suspended. This is necessary for timetable entries because
    /// a JavaScript timer can't wake an iOS app on the Lock Screen.
    @available(iOS 26.0, *)
    func schedule(id: String, state: CourseLectureAttributes.ContentState) async throws {
        pruneIssuedActivities()

        guard state.startTime > Date() else {
            try await upsert(id: id, state: state)
            return
        }

        let currentActivities = Activity<CourseLectureAttributes>.activities
        if currentActivities.contains(where: { $0.attributes.id == id }) || wasIssued(id: id) {
            return
        }

        let activity = try Activity.request(
            attributes: CourseLectureAttributes(id: id),
            content: content(for: state),
            pushType: nil,
            style: .standard,
            alertConfiguration: AlertConfiguration(
                title: "Vorlesung beginnt",
                body: "DHBW Planner",
                sound: .default
            ),
            start: state.startTime
        )
        recordIssuedActivity(id: id, through: state.endTime)
        observe(activity)
    }

    func end(id: String) async {
        automaticEndTasks[id]?.cancel()
        automaticEndTasks[id] = nil
        for activity in Activity<CourseLectureAttributes>.activities where activity.attributes.id == id {
            await finish(activity)
        }
    }

    func endAll() async {
        for task in automaticEndTasks.values {
            task.cancel()
        }
        automaticEndTasks.removeAll()
        for activity in Activity<CourseLectureAttributes>.activities {
            await finish(activity)
        }
        pruneIssuedActivities()
    }

    private func request(id: String, state: CourseLectureAttributes.ContentState) throws -> Activity<CourseLectureAttributes> {
        if #available(iOS 16.2, *) {
            return try Activity.request(
                attributes: CourseLectureAttributes(id: id),
                content: content(for: state),
                pushType: nil
            )
        }

        return try Activity.request(
            attributes: CourseLectureAttributes(id: id),
            contentState: state,
            pushType: nil
        )
    }

    private func update(_ activity: Activity<CourseLectureAttributes>, with state: CourseLectureAttributes.ContentState) async {
        if #available(iOS 16.2, *) {
            await activity.update(content(for: state))
        } else {
            await activity.update(using: state)
        }
    }

    private func finish(_ activity: Activity<CourseLectureAttributes>) async {
        if #available(iOS 16.2, *) {
            await activity.end(
                ActivityContent(state: activity.content.state, staleDate: nil),
                dismissalPolicy: .immediate
            )
        } else {
            await activity.end(using: activity.contentState, dismissalPolicy: .immediate)
        }
    }

    @available(iOS 16.2, *)
    private func content(for state: CourseLectureAttributes.ContentState) -> ActivityContent<CourseLectureAttributes.ContentState> {
        // If iOS doesn't get CPU time to run our best-effort end task, the
        // widget still transitions to its explicit "ended" state at the
        // course end rather than continuing an obsolete countdown.
        ActivityContent(state: state, staleDate: state.endTime, relevanceScore: 100)
    }

    private func hasSameContent(
        _ activity: Activity<CourseLectureAttributes>,
        as state: CourseLectureAttributes.ContentState
    ) -> Bool {
        if #available(iOS 16.2, *) {
            return activity.content.state == state
        }
        return activity.contentState == state
    }

    private func endOtherActivities(except id: String) async {
        for activity in Activity<CourseLectureAttributes>.activities where activity.attributes.id != id {
            await finish(activity)
        }
    }

    private func endDuplicateActivities(for id: String, keeping activityID: String) async {
        for activity in Activity<CourseLectureAttributes>.activities
        where activity.attributes.id == id && activity.id != activityID {
            await finish(activity)
        }
    }

    private func scheduleAutomaticEnd(id: String, state: CourseLectureAttributes.ContentState) {
        automaticEndTasks[id]?.cancel()
        let delay = state.endTime.timeIntervalSinceNow
        guard delay > 0 else { return }

        automaticEndTasks[id] = Task { [weak self] in
            let nanoseconds = UInt64(delay * 1_000_000_000)
            try? await Task.sleep(nanoseconds: nanoseconds)
            guard !Task.isCancelled else { return }
            await self?.end(id: id)
        }
    }

    private func observe(_ activity: Activity<CourseLectureAttributes>) {
        let id = activity.attributes.id
        let endTime = activity.contentState.endTime
        Task { [weak self] in
            for await state in activity.activityStateUpdates {
                if state == .dismissed || state == .ended {
                    await self?.recordIssuedActivity(id: id, through: endTime)
                    return
                }
            }
        }
    }

    private func wasIssued(id: String) -> Bool {
        guard let validThrough = issuedActivities[id] else { return false }
        return validThrough > Date()
    }

    private func recordIssuedActivity(id: String, through endTime: Date) {
        let minimumRetention = Date().addingTimeInterval(5 * 60)
        let retentionAfterEnd = endTime.addingTimeInterval(4 * 60 * 60)
        issuedActivities[id] = max(minimumRetention, retentionAfterEnd)
        saveIssuedActivities()
    }

    private func pruneIssuedActivities() {
        let now = Date()
        issuedActivities = issuedActivities.filter { $0.value > now }
        saveIssuedActivities()
    }

    private static func loadIssuedActivities() -> [String: Date] {
        guard let values = UserDefaults.standard.dictionary(forKey: issuedActivitiesKey) as? [String: Double] else {
            return [:]
        }
        return values.mapValues(Date.init(timeIntervalSince1970:))
    }

    private func saveIssuedActivities() {
        let values = issuedActivities.mapValues(\.timeIntervalSince1970)
        UserDefaults.standard.set(values, forKey: Self.issuedActivitiesKey)
    }
}

@available(iOS 16.1, *)
private final class CourseLiveActivityControllerHolder {
    let value = CourseLiveActivityController()
}
#endif

@objc(CourseLiveActivityPlugin)
public class CourseLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CourseLiveActivityPlugin"
    public let jsName = "CourseLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endAll", returnType: CAPPluginReturnPromise)
    ]

    #if canImport(ActivityKit)
    private let controllerLock = NSLock()
    private var controllerHolder: Any?

    @available(iOS 16.1, *)
    private func liveActivityController() -> CourseLiveActivityController {
        controllerLock.lock()
        defer { controllerLock.unlock() }

        if let holder = controllerHolder as? CourseLiveActivityControllerHolder {
            return holder.value
        }

        let holder = CourseLiveActivityControllerHolder()
        controllerHolder = holder
        return holder.value
    }
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

    @objc func schedule(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        guard #available(iOS 26.0, *) else {
            // The JavaScript boundary timer remains the compatibility path on
            // earlier iOS versions.
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

        let controller = liveActivityController()
        Task {
            do {
                try await controller.schedule(id: payload.id, state: payload.state)
                call.resolve()
            } catch {
                call.reject("Unable to schedule Live Activity", nil, error)
            }
        }
        #else
        call.resolve()
        #endif
    }

    @objc func end(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty else {
            call.reject("Missing id")
            return
        }

        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
            let controller = liveActivityController()
            Task {
                await controller.end(id: id)
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
            let controller = liveActivityController()
            Task {
                await controller.endAll()
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

        let controller = liveActivityController()
        Task {
            do {
                try await controller.upsert(id: payload.id, state: payload.state)
                call.resolve()
            } catch {
                call.reject("Unable to start Live Activity", nil, error)
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
