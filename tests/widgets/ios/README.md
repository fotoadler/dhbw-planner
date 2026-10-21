# Native Dynamic Type layout audit

`TypeSizeAudit.swift` is a standalone simulator QA app, not part of the production widget target. Compile it alongside `ios/App/CourseLiveActivityWidget/Schedule/ScheduleWidget.swift` in a minimal SwiftUI simulator app.

It renders all 12 Dynamic Type settings across four representative iPhone widget dimensions, three families and eight content states (1152 combinations). Long course/lecture/room names, a free day with a next-lecture card, a completed day, and manual Rapla with no course or room are deliberate. The audit inspects an unclipped transparent render for pixels outside the allocated content bounds, saves representative PNGs and writes `Documents/type-audit/report.txt` in its own simulator container. A passing report proves these bounds checks, not every possible content string or actual Home Screen interaction.

Review the largest/smallest examples visually as well. Re-run after typography or widget spacing changes. The QA app uses fixtures only and must never be shipped with the main app.
