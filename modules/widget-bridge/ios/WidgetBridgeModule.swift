import ExpoModulesCore
import WidgetKit

// Mismo App Group y mismas claves que targets/widget/SharedStore.swift. La app escribe
// "kuenta.widgetData" (workspace + saldo + presets) y lee/borra "kuenta.pendingEntries" (los
// accesos rápidos que el usuario tocó en el widget mientras la app estaba cerrada).
private let appGroupId = "group.com.adisoft.kuenta"
private let dataKey = "kuenta.widgetData"
private let pendingKey = "kuenta.pendingEntries"

public class WidgetBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WidgetBridge")

    Function("setSharedData") { (json: String) -> Void in
      UserDefaults(suiteName: appGroupId)?.set(json.data(using: .utf8), forKey: dataKey)
    }

    Function("getSharedDataJson") { () -> String in
      guard let data = UserDefaults(suiteName: appGroupId)?.data(forKey: dataKey),
        let json = String(data: data, encoding: .utf8)
      else {
        return "null"
      }
      return json
    }

    Function("getPendingEntriesJson") { () -> String in
      guard let data = UserDefaults(suiteName: appGroupId)?.data(forKey: pendingKey),
        let json = String(data: data, encoding: .utf8)
      else {
        return "[]"
      }
      return json
    }

    Function("clearPendingEntries") { () -> Void in
      UserDefaults(suiteName: appGroupId)?.removeObject(forKey: pendingKey)
    }

    Function("reloadWidgets") { () -> Void in
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }
}
