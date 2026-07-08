import ActivityKit
import SwiftUI
import WidgetKit

@main
struct CourseLiveActivityWidgetBundle: WidgetBundle {
    var body: some Widget {
        CourseLiveActivityWidget()
    }
}

struct CourseLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CourseLectureAttributes.self) { context in
            CourseLiveLockScreenView(state: context.state)
                .activityBackgroundTint(.white)
                .activitySystemActionForegroundColor(Color(red: 0.89, green: 0.0, blue: 0.1))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.state.title)
                            .font(.headline)
                            .lineLimit(1)
                        Text(context.state.room)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(context.state.endTime, style: .timer)
                            .font(.headline.monospacedDigit())
                        Text("noch")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    CourseLiveProgressView(state: context.state)
                }
            } compactLeading: {
                Image(systemName: "calendar")
            } compactTrailing: {
                Text(context.state.endTime, style: .timer)
                    .font(.caption2.monospacedDigit())
                    .frame(maxWidth: 44)
            } minimal: {
                Image(systemName: "clock")
            }
        }
    }
}

struct CourseLiveLockScreenView: View {
    let state: CourseLectureAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(state.title)
                        .font(.headline)
                        .lineLimit(2)
                    if !state.lecturer.isEmpty {
                        Text(state.lecturer)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
                Spacer(minLength: 12)
                VStack(alignment: .trailing, spacing: 2) {
                    Text(state.endTime, style: .timer)
                        .font(.title3.monospacedDigit().weight(.semibold))
                    Text("verbleibend")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            CourseLiveProgressView(state: state)

            HStack {
                if !state.room.isEmpty {
                    Label(state.room, systemImage: "mappin.and.ellipse")
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                if !state.nextTitle.isEmpty, let nextStartTime = state.nextStartTime {
                    Text("Danach \(nextStartTime, style: .time) \(state.nextTitle)")
                        .lineLimit(1)
                        .foregroundStyle(.secondary)
                }
            }
            .font(.caption)
        }
        .padding(16)
    }
}

struct CourseLiveProgressView: View {
    let state: CourseLectureAttributes.ContentState

    var body: some View {
        ProgressView(timerInterval: state.startTime...state.endTime, countsDown: false)
            .tint(Color(red: 0.89, green: 0.0, blue: 0.1))
    }
}
