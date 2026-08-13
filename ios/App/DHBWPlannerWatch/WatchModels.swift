import Foundation

struct WatchScheduleEntry: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let startTime: Double
    let endTime: Double
    let room: String
    let lecturer: String
    let extra: String
    let type: String
    let day: String

    var startDate: Date { Date(timeIntervalSince1970: startTime / 1000) }
    var endDate: Date { Date(timeIntervalSince1970: endTime / 1000) }
}

struct WatchScheduleSnapshot: Codable, Hashable {
    let version: Int
    let timezone: String
    let updatedAt: Double
    let currentEntry: WatchScheduleEntry?
    let nextEntry: WatchScheduleEntry?
    let today: String
    let todayEntries: [WatchScheduleEntry]
    let upcomingEntries: [WatchScheduleEntry]

    var updatedDate: Date { Date(timeIntervalSince1970: updatedAt / 1000) }
}
