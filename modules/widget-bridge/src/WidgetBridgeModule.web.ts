import { registerWebModule, NativeModule } from 'expo';

// El widget de iPhone solo existe en iOS; en web estas llamadas son no-ops seguros.
class WidgetBridgeModule extends NativeModule<{}> {
  setSharedData(_json: string): void {}
  getPendingEntriesJson(): string {
    return '[]';
  }
  clearPendingEntries(): void {}
  reloadWidgets(): void {}
}

export default registerWebModule(WidgetBridgeModule);
