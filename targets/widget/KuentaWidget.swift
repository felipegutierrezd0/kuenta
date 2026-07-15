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
        ]
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
  var entry: KuentaProvider.Entry

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text(entry.data.workspaceName ?? "Kuenta")
          .font(.caption)
          .fontWeight(.semibold)
          .foregroundStyle(.secondary)
        Spacer()
        Link(destination: URL(string: "kuenta://add")!) {
          Image(systemName: "plus.circle.fill")
            .font(.title3)
        }
      }

      if let balance = entry.data.totalBalance {
        Text(formatCurrency(balance))
          .font(.title2)
          .fontWeight(.bold)
      }

      Spacer(minLength: 2)

      if entry.data.presets.isEmpty {
        Text("Configura accesos rápidos en Kuenta → engranaje → Widget")
          .font(.caption2)
          .foregroundStyle(.secondary)
      } else {
        LazyVGrid(
          columns: [GridItem(.flexible()), GridItem(.flexible())],
          spacing: 6
        ) {
          ForEach(entry.data.presets.prefix(4)) { preset in
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
    .padding(14)
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
    .description("Registra gastos e ingresos sin abrir la app.")
    .supportedFamilies([.systemMedium])
  }
}

@main
struct KuentaWidgetBundle: WidgetBundle {
  var body: some Widget {
    KuentaWidget()
  }
}
