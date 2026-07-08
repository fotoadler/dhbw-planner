import ActivityKit
import Foundation

public struct CourseLectureAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var title: String
        public var room: String
        public var lecturer: String
        public var startTime: Date
        public var endTime: Date
        public var nextTitle: String
        public var nextStartTime: Date?
    }

    public var id: String
}
