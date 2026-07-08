import Foundation

#if canImport(ActivityKit)
import ActivityKit

@available(iOS 16.1, *)
public struct CourseLectureAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var title: String
        public var room: String
        public var lecturer: String
        public var startTime: Date
        public var endTime: Date
        public var nextTitle: String
        public var nextStartTime: Date?

        public init(
            title: String,
            room: String,
            lecturer: String,
            startTime: Date,
            endTime: Date,
            nextTitle: String,
            nextStartTime: Date?
        ) {
            self.title = title
            self.room = room
            self.lecturer = lecturer
            self.startTime = startTime
            self.endTime = endTime
            self.nextTitle = nextTitle
            self.nextStartTime = nextStartTime
        }
    }

    public var id: String

    public init(id: String) {
        self.id = id
    }
}
#endif
