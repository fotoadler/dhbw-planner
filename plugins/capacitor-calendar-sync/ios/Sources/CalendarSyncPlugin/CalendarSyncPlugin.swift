import Capacitor
import EventKit
import Foundation
import UIKit

@objc(CalendarSyncPlugin)
public class CalendarSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CalendarSyncPlugin"
    public let jsName = "CalendarSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise)
    ]
    private let store = EKEventStore()
    private let worker = DispatchQueue(label: "de.dhbw.raplaplan.calendar-sync")
    private let calendarKey = "dhbw-planner-owned-calendar-v1"
    private let prefix = "dhbw-planner://calendar/"

    private var granted: Bool {
        let status = EKEventStore.authorizationStatus(for: .event)
        if #available(iOS 17.0, *) { return status == .fullAccess }
        return status == .authorized
    }
    private func status(_ call: CAPPluginCall) {
        let permission = granted ? "granted" : EKEventStore.authorizationStatus(for: .event) == .notDetermined ? "prompt" : "denied"
        call.resolve(["available": true, "permission": permission])
    }
    @objc func getStatus(_ call: CAPPluginCall) { status(call) }
    @objc func requestAccess(_ call: CAPPluginCall) {
        let completion: (Bool, Error?) -> Void = { _, error in
            if let error = error { call.reject("Kalenderzugriff fehlgeschlagen.", nil, error); return }
            self.status(call)
        }
        if granted { status(call); return }
        if #available(iOS 17.0, *) { store.requestFullAccessToEvents(completion: completion) }
        else { store.requestAccess(to: .event, completion: completion) }
    }
    private func ownCalendar() throws -> EKCalendar {
        if let id = UserDefaults.standard.string(forKey: calendarKey), let calendar = store.calendar(withIdentifier: id), calendar.allowsContentModifications { return calendar }
        guard let source = store.sources.first(where: { $0.sourceType == .local }) ?? store.defaultCalendarForNewEvents?.source else {
            throw NSError(domain: "CalendarSync", code: 1, userInfo: [NSLocalizedDescriptionKey: "Kein beschreibbarer Kalender verfügbar."])
        }
        let calendar = EKCalendar(for: .event, eventStore: store)
        calendar.title = "DHBW Planner"
        calendar.source = source
        calendar.cgColor = UIColor(red: 0.886, green: 0, blue: 0.102, alpha: 1).cgColor
        try store.saveCalendar(calendar, commit: true)
        UserDefaults.standard.set(calendar.calendarIdentifier, forKey: calendarKey)
        return calendar
    }
    private func date(_ milliseconds: Double, allDay: Bool) -> Date {
        let instant = Date(timeIntervalSince1970: milliseconds / 1000)
        if !allDay { return instant }
        var utc = Calendar(identifier: .gregorian); utc.timeZone = TimeZone(secondsFromGMT: 0)!
        let parts = utc.dateComponents([.year, .month, .day], from: instant)
        var berlin = Calendar(identifier: .gregorian); berlin.timeZone = TimeZone(identifier: "Europe/Berlin")!
        return berlin.date(from: parts)!
    }
    @objc func sync(_ call: CAPPluginCall) {
        guard granted else { call.reject("Kalenderzugriff fehlt."); return }
        worker.async {
            do {
                guard let events = call.getArray("events", JSObject.self), let start = call.getDouble("rangeStart"), let end = call.getDouble("rangeEnd"), end > start else {
                    throw NSError(domain: "CalendarSync", code: 2, userInfo: nil)
                }
                var desired: [String: JSObject] = [:]
                for event in events {
                    guard let key = event["key"] as? String, key.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil,
                          let title = event["title"] as? String, !title.isEmpty,
                          let from = event["start"] as? Double, let to = event["end"] as? Double, to > from,
                          event["allDay"] is Bool, event["location"] is String, event["notes"] is String else {
                        throw NSError(domain: "CalendarSync", code: 3, userInfo: nil)
                    }
                    desired[key] = event
                }
                let calendar = try self.ownCalendar()
                let from = Date(timeIntervalSince1970: start / 1000), to = Date(timeIntervalSince1970: end / 1000)
                // EventKit limits one predicate to four years. Query smaller
                // chunks so historical courses and later course switches remain complete.
                var queried: [EKEvent] = []
                var cursor = from
                let dates = Calendar(identifier: .gregorian)
                while cursor < to {
                    let next = min(dates.date(byAdding: .year, value: 3, to: cursor)!, to)
                    let predicate = self.store.predicateForEvents(withStart: cursor, end: next, calendars: [calendar])
                    queried += self.store.events(matching: predicate).filter { $0.startDate >= cursor && $0.startDate < next }
                    cursor = next
                }
                var existing: [String: EKEvent] = [:]
                var obsolete: [EKEvent] = []
                for event in queried {
                    guard event.startDate >= from, event.startDate < to, let marker = event.url?.absoluteString, marker.hasPrefix(self.prefix) else { continue }
                    let key = String(marker.dropFirst(self.prefix.count))
                    guard key.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil else { continue }
                    if existing[key] == nil { existing[key] = event } else { obsolete.append(event) }
                }
                for (key, data) in desired {
                    let event = existing[key] ?? EKEvent(eventStore: self.store)
                    let allDay = data["allDay"] as! Bool
                    event.calendar = calendar
                    event.title = data["title"] as? String
                    event.timeZone = TimeZone(identifier: "Europe/Berlin")
                    event.startDate = self.date(data["start"] as! Double, allDay: allDay)
                    event.endDate = self.date(data["end"] as! Double, allDay: allDay)
                    // EventKit date/time-zone setters can clear the all-day flag.
                    event.isAllDay = allDay
                    event.location = data["location"] as? String
                    event.notes = data["notes"] as? String
                    event.url = URL(string: self.prefix + key)
                    event.alarms = [] // App reminders remain the single notification source.
                    try self.store.save(event, span: .thisEvent, commit: false)
                }
                try self.store.commit()
                if call.getBool("allowDelete") == true {
                    obsolete += existing.filter { desired[$0.key] == nil }.map { $0.value }
                    for event in obsolete { try self.store.remove(event, span: .thisEvent, commit: false) }
                    try self.store.commit()
                }
                call.resolve(["count": desired.count])
            } catch {
                self.store.reset()
                call.reject("Kalender konnte nicht synchronisiert werden.", nil, error)
            }
        }
    }
}
