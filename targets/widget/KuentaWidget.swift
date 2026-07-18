import SwiftUI
import WidgetKit

struct KuentaEntry: TimelineEntry {
  let date: Date
  let data: WidgetSharedData
}

struct KuentaProvider: TimelineProvider {
  func placeholder(in context: Context) -> KuentaEntry {
    KuentaEntry(
      date: Date(),
      data: WidgetSharedData(
        workspaceName: "Kuenta",
        totalBalance: 0,
        presets: [
          WidgetPreset(
            id: "preview-1", label: "Café", type: "gasto", categoryId: nil,
            categoryName: "Comida", accountId: nil, accountName: "Efectivo", amount: 5),
          WidgetPreset(
            id: "preview-2", label: "Uber", type: "gasto", categoryId: nil,
            categoryName: "Transporte", accountId: nil, accountName: "Efectivo", amount: 15),
        ],
        categories: [],
        selectedType: nil,
        selectedCategoryId: nil
      ))
  }

  func getSnapshot(in context: Context, completion: @escaping (KuentaEntry) -> Void) {
    completion(KuentaEntry(date: Date(), data: SharedStore.loadData()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<KuentaEntry>) -> Void) {
    let entry = KuentaEntry(date: Date(), data: SharedStore.loadData())
    // No hay una hora futura conocida en la que los datos cambien: la app llama a
    // WidgetCenter.reloadAllTimelines() cada vez que hay algo nuevo que mostrar.
    completion(Timeline(entries: [entry], policy: .never))
  }
}

func formatCurrency(_ value: Double) -> String {
  let formatter = NumberFormatter()
  formatter.numberStyle = .currency
  formatter.maximumFractionDigits = 0
  formatter.locale = Locale(identifier: "es_MX")
  return formatter.string(from: NSNumber(value: value)) ?? "$0"
}

struct KuentaWidgetView: View {
  @Environment(\.widgetFamily) var family
  var entry: KuentaProvider.Entry

  var categoryLimit: Int { family == .systemLarge ? 8 : 4 }
  var presetLimit: Int { family == .systemLarge ? 4 : 4 }

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      header

      if let selectedType = entry.data.selectedType, let categoryId = entry.data.selectedCategoryId,
        let category = entry.data.categories.first(where: { $0.id == categoryId })
      {
        amountPicker(type: selectedType, category: category)
      } else if let selectedType = entry.data.selectedType {
        categoryPicker(for: selectedType)
      } else {
        typePicker
        if !entry.data.presets.isEmpty {
          Spacer(minLength: 2)
          presetsGrid
        }
      }
    }
    .padding(14)
  }

  var header: some View {
    HStack {
      Text(entry.data.workspaceName ?? "Kuenta")
        .font(.caption)
        .fontWeight(.semibold)
        .foregroundStyle(.secondary)
      Spacer()
      if let balance = entry.data.totalBalance, entry.data.selectedType == nil {
        Text(formatCurrency(balance))
          .font(.caption)
          .fontWeight(.bold)
      }
      Link(destination: URL(string: "kuenta://add")!) {
        Image(systemName: "plus.circle.fill")
          .font(.title3)
      }
    }
  }

  // Paso 1: elegir gasto o ingreso. No crea ningún movimiento todavía.
  var typePicker: some View {
    HStack(spacing: 8) {
      Button(intent: SelectTypeIntent(type: "gasto")) {
        Text("Gasto")
          .font(.subheadline).fontWeight(.semibold)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 10)
          .background(Color.red.opacity(0.15))
          .foregroundStyle(.red)
          .clipShape(RoundedRectangle(cornerRadius: 10))
      }
      .buttonStyle(.plain)
      Button(intent: SelectTypeIntent(type: "ingreso")) {
        Text("Ingreso")
          .font(.subheadline).fontWeight(.semibold)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 10)
          .background(Color.green.opacity(0.15))
          .foregroundStyle(.green)
          .clipShape(RoundedRectangle(cornerRadius: 10))
      }
      .buttonStyle(.plain)
    }
  }

  // Paso 2: ya eligió tipo, ahora elige categoría.
  func categoryPicker(for type: String) -> some View {
    let options = entry.data.categories.filter { $0.type == type }
    return VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text(type == "gasto" ? "¿Qué categoría de gasto?" : "¿Qué categoría de ingreso?")
          .font(.caption2)
          .foregroundStyle(.secondary)
        Spacer()
        Button(intent: SelectTypeIntent(type: "")) {
          Image(systemName: "xmark.circle.fill")
            .foregroundStyle(.secondary)
        }
        .buttonStyle(.plain)
      }
      if options.isEmpty {
        Text("Sin categorías con movimientos previos de este tipo todavía.")
          .font(.caption2)
          .foregroundStyle(.secondary)
      } else {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 6) {
          ForEach(options.prefix(categoryLimit)) { category in
            Button(intent: SelectCategoryIntent(type: type, categoryId: category.id)) {
              Text(category.name)
                .font(.caption)
                .fontWeight(.semibold)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(8)
                .background(Color.gray.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            .buttonStyle(.plain)
          }
        }
      }
    }
  }

  // Paso 3: ya eligió tipo y categoría, ahora elige el monto — iOS no permite un teclado dentro
  // de un widget, así que se ofrecen los últimos montos usados en esta categoría como botones.
  // Tocar uno registra el movimiento de inmediato.
  func amountPicker(type: String, category: WidgetCategory) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text("\(category.name): ¿qué monto?")
          .font(.caption2)
          .foregroundStyle(.secondary)
          .lineLimit(1)
        Spacer()
        Button(intent: SelectCategoryIntent(type: type, categoryId: "")) {
          Image(systemName: "chevron.left.circle.fill")
            .foregroundStyle(.secondary)
        }
        .buttonStyle(.plain)
      }
      LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 6) {
        ForEach(category.recentAmounts.prefix(categoryLimit), id: \.self) { amount in
          Button(intent: LogAmountIntent(type: type, categoryId: category.id, amount: amount)) {
            Text(formatCurrency(amount))
              .font(.caption)
              .fontWeight(.semibold)
              .frame(maxWidth: .infinity)
              .padding(.vertical, 10)
              .background(type == "gasto" ? Color.red.opacity(0.15) : Color.green.opacity(0.15))
              .foregroundStyle(type == "gasto" ? .red : .green)
              .clipShape(RoundedRectangle(cornerRadius: 10))
          }
          .buttonStyle(.plain)
        }
      }
    }
  }

  var presetsGrid: some View {
    LazyVGrid(
      columns: [GridItem(.flexible()), GridItem(.flexible())],
      spacing: 6
    ) {
      ForEach(entry.data.presets.prefix(presetLimit)) { preset in
        Button(intent: LogPresetIntent(presetId: preset.id)) {
          VStack(alignment: .leading, spacing: 2) {
            Text(preset.label)
              .font(.caption)
              .fontWeight(.semibold)
              .lineLimit(1)
            Text((preset.type == "gasto" ? "-" : "+") + formatCurrency(preset.amount))
              .font(.caption2)
              .foregroundStyle(preset.type == "gasto" ? .red : .green)
            if let accountName = preset.accountName {
              Text(accountName)
                .font(.system(size: 9))
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(8)
          .background(Color.gray.opacity(0.12))
          .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
      }
    }
  }
}

struct KuentaWidget: Widget {
  let kind: String = "KuentaWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: KuentaProvider()) { entry in
      KuentaWidgetView(entry: entry)
        .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("Kuenta - Acceso rápido")
    .description("Registra gastos e ingresos sin abrir la app, eligiendo tipo y categoría en el momento.")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}

@main
struct KuentaWidgetBundle: WidgetBundle {
  var body: some Widget {
    KuentaWidget()
  }
}
