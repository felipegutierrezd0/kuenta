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

export interface WidgetSharedData {
  workspaceName: string | null;
  totalBalance: number | null;
  presets: WidgetPreset[];
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

// Empuja el snapshot (nombre de workspace, saldo total, presets) que el widget necesita para
// dibujarse; el widget en sí no tiene acceso a Supabase ni al mock store, solo lee este JSON.
export function pushWidgetData(data: WidgetSharedData) {
  if (!isSupported) return;
  WidgetBridgeModule.setSharedData(JSON.stringify(data));
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
