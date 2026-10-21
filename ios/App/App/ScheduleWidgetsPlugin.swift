import Capacitor
import WidgetKit

@objc(ScheduleWidgetsPlugin)
final class ScheduleWidgetsPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "ScheduleWidgetsPlugin"
    let jsName = "ScheduleWidgets"
    let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise)]
    @objc func update(_ call: CAPPluginCall) {
        guard let json = call.getString("snapshot"), let data = json.data(using: .utf8), data.count < 524288,
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any], object["version"] as? Int == 1 else {
            call.reject("Invalid widget snapshot"); return
        }
        let group = "group.de.dhbw.raplaplan.widgets"
        guard FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) != nil,
              let defaults = UserDefaults(suiteName: group) else {
            call.reject("Widget app group unavailable"); return
        }
        if defaults.string(forKey: "schedule.v1") != json {
            defaults.set(json, forKey: "schedule.v1")
            WidgetCenter.shared.reloadTimelines(ofKind: "DHBWSchedule")
        }
        call.resolve()
    }
}
