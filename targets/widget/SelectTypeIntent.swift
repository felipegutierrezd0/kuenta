import AppIntents
import WidgetKit

// Primer toque del selector en vivo: guarda "gasto" o "ingreso" (o nil para cancelar/volver) en el
// App Group y recarga el widget, que entonces se redibuja mostrando las categorías de ese tipo.
// No crea ningún movimiento todavía.
struct SelectTypeIntent: AppIntent {
  static var title: LocalizedStringResource = "Elegir tipo de movimiento en Kuenta"

  @Parameter(title: "Tipo")
  var type: String

  init() {}

  init(type: String) {
    self.type = type
  }

  func perform() async throws -> some IntentResult {
    SharedStore.setSelection(type: type.isEmpty ? nil : type, categoryId: nil)
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}
