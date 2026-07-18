import { Platform } from 'react-native';

import WidgetBridgeModule from '@/modules/widget-bridge/src/WidgetBridgeModule';

export interface WidgetPreset {
  id: string;
  label: string;
  type: 'gasto' | 'ingreso';
  categoryId: string | null;
  categoryName: string | null;
  accountId: string | null;
  accountName: string | null;
  amount: number;
}

export interface WidgetCategory {
  id: string;
  name: string;
  type: 'gasto' | 'ingreso';
  // iOS no permite mostrar un teclado dentro de un widget, así que en vez de escribir un monto
  // libre, el widget ofrece los últimos montos usados en esta categoría como botones (más
  // reciente primero, sin duplicados). Solo se ofrecen categorías con al menos un movimiento
  // previo.
  recentAmounts: number[];
}

export interface WidgetSharedData {
  workspaceName: string | null;
  totalBalance: number | null;
  presets: WidgetPreset[];
  categories: WidgetCategory[];
  // Selección transitoria (tipo, luego categoría) que el propio widget guarda al tocar cada
  // paso, para dibujar el siguiente. Vive aquí (no en un @State del widget) porque cada recarga
  // de un WidgetKit timeline es un proceso nuevo sin memoria propia.
  selectedType: 'gasto' | 'ingreso' | null;
  selectedCategoryId: string | null;
}

export interface PendingWidgetEntry {
  presetId: string;
  type: 'gasto' | 'ingreso';
  categoryId: string | null;
  accountId: string | null;
  amount: number;
  createdAt: string;
}

const isSupported = Platform.OS === 'ios';

// Empuja el snapshot (nombre de workspace, saldo total, presets, categorías) que el widget
// necesita para dibujarse; el widget en sí no tiene acceso a Supabase ni al mock store, solo lee
// este JSON. No toca `selectedType`/`selectedCategoryId`: esos los escribe el propio widget al
// avanzar cada paso (ver SelectTypeIntent/SelectCategoryIntent), y si la app los pisara aquí,
// tocar el siguiente paso justo después de que la app sincroniza en segundo plano perdería la
// selección en curso.
export function pushWidgetData(data: Omit<WidgetSharedData, 'selectedType' | 'selectedCategoryId'>) {
  if (!isSupported) return;
  let selectedType: WidgetSharedData['selectedType'] = null;
  let selectedCategoryId: WidgetSharedData['selectedCategoryId'] = null;
  try {
    const current = JSON.parse(WidgetBridgeModule.getSharedDataJson()) as WidgetSharedData | null;
    selectedType = current?.selectedType ?? null;
    selectedCategoryId = current?.selectedCategoryId ?? null;
  } catch {
    selectedType = null;
    selectedCategoryId = null;
  }
  WidgetBridgeModule.setSharedData(JSON.stringify({ ...data, selectedType, selectedCategoryId }));
  WidgetBridgeModule.reloadWidgets();
}

// Lee (sin borrar) los accesos rápidos que el usuario tocó en el widget mientras la app estaba
// cerrada/en background. Cada uno debe insertarse como transacción real y luego limpiarse.
export function readPendingWidgetEntries(): PendingWidgetEntry[] {
  if (!isSupported) return [];
  try {
    const raw = WidgetBridgeModule.getPendingEntriesJson();
    return JSON.parse(raw) as PendingWidgetEntry[];
  } catch {
    return [];
  }
}

export function clearPendingWidgetEntries() {
  if (!isSupported) return;
  WidgetBridgeModule.clearPendingEntries();
}

export function reloadWidgets() {
  if (!isSupported) return;
  WidgetBridgeModule.reloadWidgets();
}
