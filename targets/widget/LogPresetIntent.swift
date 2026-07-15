import AppIntents
import WidgetKit

// Se ejecuta directamente desde el widget (botón), sin abrir la app: registra el preset como una
// entrada "pendiente" en el App Group compartido. La app la lee y la inserta en Supabase/el store
// la próxima vez que se abra o pase a primer plano (ver lib/widgetSync.ts).
struct LogPresetIntent: AppIntent {
  static var title: LocalizedStringResource = "Registrar acceso rápido de Kuenta"
  static var description = IntentDescription(
    "Registra un movimiento preconfigurado en Kuenta sin abrir la app."
  )

  @Parameter(title: "ID del preset")
  var presetId: String

  init() {}

  init(presetId: String) {
    self.presetId = presetId
  }

  func perform() async throws -> some IntentResult {
    let data = SharedStore.loadData()
    if let preset = data.presets.first(where: { $0.id == presetId }) {
      let entry = PendingEntry(
        presetId: preset.id,
        type: preset.type,
        categoryId: preset.categoryId,
        accountId: preset.accountId,
        amount: preset.amount,
        createdAt: ISO8601DateFormatter().string(from: Date())
      )
      SharedStore.appendPending(entry)
    }
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}
