import Capacitor
import UIKit

@objc(SupporterIconPlugin)
final class SupporterIconPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "SupporterIconPlugin"
    let jsName = "SupporterIcon"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getIcon", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setIcon", returnType: CAPPluginReturnPromise)
    ]

    @objc func getIcon(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(["gold": UIApplication.shared.alternateIconName == "SupporterGold",
                          "available": UIApplication.shared.supportsAlternateIcons])
        }
    }

    @objc func setIcon(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard UIApplication.shared.supportsAlternateIcons else {
                call.reject("Alternative App-Symbole sind auf diesem Gerät nicht verfügbar.")
                return
            }
            let name: String? = call.getBool("gold", false) ? "SupporterGold" : nil
            if UIApplication.shared.alternateIconName == name { call.resolve(); return }
            UIApplication.shared.setAlternateIconName(name) { error in
                if let error = error { call.reject(error.localizedDescription) }
                else { call.resolve() }
            }
        }
    }
}
