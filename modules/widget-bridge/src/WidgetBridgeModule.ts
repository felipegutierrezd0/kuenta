import { NativeModule, requireNativeModule } from 'expo';

declare class WidgetBridgeModule extends NativeModule<{}> {
  setSharedData(json: string): void;
  getPendingEntriesJson(): string;
  clearPendingEntries(): void;
  reloadWidgets(): void;
}

export default requireNativeModule<WidgetBridgeModule>('WidgetBridge');
