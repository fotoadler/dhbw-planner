import SwiftUI
import WidgetKit
import UIKit

@main
struct TypeSizeAuditApp: App {
    var body: some Scene { WindowGroup { Color.clear.onAppear { runAudit() } } }
    @MainActor func runAudit() {
        let now=Date();let formatter=DateFormatter();formatter.dateFormat="yyyy-MM-dd";formatter.timeZone=TimeZone(identifier:"Europe/Berlin")
        let events=["Kommunikationswissenschaftliche Forschungsmethoden", "Medienwirtschaft und Medienmanagement", "Marketing", "Medienrecht", "Projektarbeit"].enumerated().map { i,title in
            PlannerEvent(title:title,start:now.addingTimeInterval(Double(i+1)*3600).timeIntervalSince1970*1000,end:now.addingTimeInterval(Double(i+2)*3600).timeIntervalSince1970*1000,room:"RV 201 · Marienplatz")
        }
        let output=URL(fileURLWithPath:NSHomeDirectory()).appendingPathComponent("Documents/type-audit");try? FileManager.default.createDirectory(at:output,withIntermediateDirectories:true)
        var failures=[String]();var checked=0
        let families:[(String,WidgetFamily)]=[("small",.systemSmall),("medium",.systemMedium),("large",.systemLarge)]
        let screens:[(CGFloat,CGFloat,CGFloat)]=[(141,292,311),(158,329,345),(170,360,380),(182,385,405)]
        for state in ["schedule","free","free-next","finished","unknown","locked","rapla-schedule","rapla-free"] {
          let todayEvents=state == "rapla-schedule" ? events.map { PlannerEvent(title:$0.title,start:$0.start,end:$0.end,room:"") } : state == "schedule" ? events : state == "finished" ? events.map { PlannerEvent(title:$0.title,start:$0.start-7*3600000,end:$0.end-7*3600000,room:$0.room) } : []
          var days=[PlannerDay(date:formatter.string(from:now),known:state != "unknown",events:todayEvents)]
          if state == "free-next" { days.append(PlannerDay(date:formatter.string(from:now.addingTimeInterval(86400)),known:true,events:events.map { PlannerEvent(title:$0.title,start:$0.start+86400000,end:$0.end+86400000,room:$0.room) })) }
          let snapshot=PlannerSnapshot(unlocked:state != "locked",profileId:"main",course:state.hasPrefix("rapla-") ? "" : "RV-WMKMM24B",updatedAt:now.timeIntervalSince1970*1000,days:days)
          let entry=PlannerWidgetEntry(date:now,snapshot:snapshot)
          for type in DynamicTypeSize.allCases {
            for (screen,dimensions) in screens.enumerated() {
              for(name,family)in families {
                let width=family == .systemSmall ? dimensions.0 : dimensions.1
                let height=family == .systemLarge ? dimensions.2 : dimensions.0
                let content=PlannerWidgetContent(entry:entry,family:family).frame(width:width-32,height:height-32).padding(32).environment(\.dynamicTypeSize,type).environment(\.colorScheme,.light)
                let renderer=ImageRenderer(content:content);renderer.scale=1
                guard let picture=renderer.uiImage,let cg=picture.cgImage else {failures.append("Missing render \(state)/\(type)/\(screen)/\(name)");continue}
                let w=cg.width,h=cg.height;var bytes=[UInt8](repeating:0,count:w*h*4)
                let context=CGContext(data:&bytes,width:w,height:h,bitsPerComponent:8,bytesPerRow:w*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
                context.draw(cg,in:CGRect(x:0,y:0,width:w,height:h))
                var outside=0
                for y in 0..<h { for x in 0..<w {
                  if (x<30 || x>Int(width)+2 || y<30 || y>Int(height)+2) && bytes[(y*w+x)*4+3]>32 {outside += 1}
                }}
                if outside>4 { failures.append("Overflow \(outside) pixels: \(state)/\(type)/screen\(screen)/\(name)") }
                checked += 1
                if screen==0 && [DynamicTypeSize.large,.xxxLarge,.accessibility1,.accessibility5].contains(type) {
                  let preview=PlannerWidgetContent(entry:entry,family:family).padding(16).frame(width:width,height:height).background(PlannerWidgetPaper()).environment(\.dynamicTypeSize,type).environment(\.colorScheme,.light)
                  let display=ImageRenderer(content:preview);display.scale=2
                  if let png=display.uiImage?.pngData(){try? png.write(to:output.appendingPathComponent("\(state)-\(type)-\(name).png"))}
                }
              }
            }
          }
        }
        let report="Rendered \(checked) native layouts across 12 Dynamic Type sizes, 4 device dimensions, 3 families, 8 states.\n"+(failures.isEmpty ? "PASS: no content outside allocated bounds.\n" : failures.joined(separator:"\n"))
        try? report.write(to:output.appendingPathComponent("report.txt"),atomically:true,encoding:.utf8)
    }
}
