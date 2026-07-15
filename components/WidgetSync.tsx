import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useAccountBalances } from '@/lib/queries/useAccounts';
import { useAddTransaction } from '@/lib/queries/useTransactions';
import { useWidgetPresets } from '@/lib/widgetPresets';
import { clearPendingWidgetEntries, pushWidgetData, readPendingWidgetEntries, reloadWidgets } from '@/lib/widgetBridge';
import { useWorkspace } from '@/lib/WorkspaceProvider';

// Componente "headless" (no dibuja nada): mantiene sincronizado el widget de iPhone con la app.
// 1. Empuja workspace + saldo + accesos rápidos al App Group cada vez que cambian.
// 2. Al abrir/reanudar la app, lee los accesos rápidos que el usuario tocó en el widget mientras
//    la app estaba cerrada y los inserta como movimientos reales.
export function WidgetSync() {
  const { currentWorkspace } = useWorkspace();
  const { total, isLoading } = useAccountBalances(currentWorkspace?.id);
  const { presets } = useWidgetPresets(currentWorkspace?.id);
  const addTransaction = useAddTransaction();
  const workspaceId = currentWorkspace?.id;

  useEffect(() => {
    if (!currentWorkspace || isLoading) return;
    pushWidgetData({
      workspaceName: currentWorkspace.name,
      totalBalance: total,
      presets,
    });
  }, [currentWorkspace, total, isLoading, presets]);

  const consumePending = useCallback(async () => {
    if (!workspaceId) return;
    const pending = readPendingWidgetEntries();
    if (pending.length === 0) return;
    for (const entry of pending) {
      await addTransaction.mutateAsync({
        workspaceId,
        type: entry.type,
        amount: entry.amount,
        categoryId: entry.categoryId,
        accountId: entry.accountId,
        note: null,
        occurredOn: entry.createdAt.slice(0, 10),
      });
    }
    clearPendingWidgetEntries();
    reloadWidgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Corre cada vez que el workspace queda listo (login, cambio de workspace) para no perderse
  // accesos rápidos pendientes por una condición de carrera si esto monta antes de que
  // WorkspaceProvider resuelva currentWorkspace.
  useEffect(() => {
    consumePending();
  }, [consumePending]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') consumePending();
    });
    return () => subscription.remove();
  }, [consumePending]);

  return null;
}
