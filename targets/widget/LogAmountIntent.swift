import AppIntents
import WidgetKit

// Tercer y último toque del selector en vivo: el usuario ya eligió tipo y categoría, y ahora toca
// uno de los montos recientes de esa categoría. Registra la entrada pendiente y reinicia el
// selector para la próxima vez.
struct LogAmountIntent: AppIntent {
  static var title: LocalizedStringResource = "Registrar monto rápido en Kuenta"
  static var description = IntentDescription(
    "Registra un movimiento en Kuenta con el tipo, categoría y monto elegidos en el widget, sin abrir la app."
  )

  @Parameter(title: "Tipo")
  var type: String

  @Parameter(title: "ID de categoría")
  var categoryId: String

  @Parameter(title: "Monto")
  var amount: Double

  init() {}

  init(type: String, categoryId: String, amount: Double) {
    self.type = type
    self.categoryId = categoryId
    self.amount = amount
  }

  func perform() async throws -> some IntentResult {
    let entry = PendingEntry(
      presetId: "category:" + categoryId,
      type: type,
      categoryId: categoryId,
      accountId: nil,
      amount: amount,
      createdAt: ISO8601DateFormatter().string(from: Date())
    )
    SharedStore.appendPending(entry)
    SharedStore.setSelection(type: nil, categoryId: nil)
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}
