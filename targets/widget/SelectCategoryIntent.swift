import AppIntents
import WidgetKit

// Segundo toque del selector en vivo: el usuario ya eligió tipo y ahora toca una categoría.
// Guarda la categoría elegida y recarga el widget, que entonces muestra el paso 3 (montos
// recientes de esa categoría). No crea ningún movimiento todavía.
struct SelectCategoryIntent: AppIntent {
  static var title: LocalizedStringResource = "Elegir categoría en Kuenta"

  @Parameter(title: "Tipo")
  var type: String

  @Parameter(title: "ID de categoría")
  var categoryId: String

  init() {}

  init(type: String, categoryId: String) {
    self.type = type
    self.categoryId = categoryId
  }

  func perform() async throws -> some IntentResult {
    SharedStore.setSelection(type: type, categoryId: categoryId)
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}
