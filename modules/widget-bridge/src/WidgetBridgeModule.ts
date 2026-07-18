import { NativeModule, requireNativeModule } from 'expo';

declare class WidgetBridgeModule extends NativeModule<{}> {
  setSharedData(json: string): void;
  getSharedDataJson(): string;
  getPendingEntriesJson(): string;
  clearPendingEntries(): void;
  reloadWidgets(): void;
}

export default requireNativeModule<WidgetBridgeModule>('WidgetBridge');
