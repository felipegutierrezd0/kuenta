import Foundation

// Debe coincidir exactamente con el grupo declarado en app.json (ios.entitlements) y con el
// bridge nativo en modules/widget-bridge, que es quien escribe estos datos desde la app.
enum SharedStore {
  static let suiteName = "group.com.adisoft.kuenta"
  static let dataKey = "kuenta.widgetData"
  static let pendingKey = "kuenta.pendingEntries"

  static var defaults: UserDefaults? {
    UserDefaults(suiteName: suiteName)
  }

  static func loadData() -> WidgetSharedData {
    guard
      let defaults = defaults,
      let raw = defaults.data(forKey: dataKey),
      let decoded = try? JSONDecoder().decode(WidgetSharedData.self, from: raw)
    else {
      return WidgetSharedData(workspaceName: "Kuenta", totalBalance: nil, presets: [])
    }
    return decoded
  }

  static func appendPending(_ entry: PendingEntry) {
    guard let defaults = defaults else { return }
    var list: [PendingEntry] = []
    if let raw = defaults.data(forKey: pendingKey),
      let decoded = try? JSONDecoder().decode([PendingEntry].self, from: raw)
    {
      list = decoded
    }
    list.append(entry)
    if let encoded = try? JSONEncoder().encode(list) {
      defaults.set(encoded, forKey: pendingKey)
    }
  }
}

struct WidgetPreset: Codable, Identifiable, Hashable {
  let id: String
  let label: String
  let type: String  // "gasto" | "ingreso"
  let categoryId: String?
  let categoryName: String?
  let accountId: String?
  let accountName: String?
  let amount: Double
}

struct WidgetSharedData: Codable {
  let workspaceName: String?
  let totalBalance: Double?
  let presets: [WidgetPreset]
}

struct PendingEntry: Codable {
  let presetId: String
  let type: String
  let categoryId: String?
  let accountId: String?
  let amount: Double
  let createdAt: String
}
