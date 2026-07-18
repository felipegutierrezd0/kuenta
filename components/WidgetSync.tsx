import { useCallback, useEffect, useMemo } from 'react';
import { AppState } from 'react-native';

import { useAccountBalances } from '@/lib/queries/useAccounts';
import { useCategories } from '@/lib/queries/useCategories';
import { useAddTransaction, useAllTransactions } from '@/lib/queries/useTransactions';
import { useWidgetPresets } from '@/lib/widgetPresets';
import { WidgetCategory, clearPendingWidgetEntries, pushWidgetData, readPendingWidgetEntries, reloadWidgets } from '@/lib/widgetBridge';
import { useWorkspace } from '@/lib/WorkspaceProvider';

// Componente "headless" (no dibuja nada): mantiene sincronizado el widget de iPhone con la app.
// 1. Empuja workspace + saldo + accesos rápidos + categorías (con su último monto usado) al App
//    Group cada vez que cambian.
// 2. Al abrir/reanudar la app, lee los accesos rápidos que el usuario tocó en el widget mientras
//    la app estaba cerrada y los inserta como movimientos reales.
export function WidgetSync() {
  const { currentWorkspace } = useWorkspace();
  const { total, isLoading } = useAccountBalances(currentWorkspace?.id);
  const { presets } = useWidgetPresets(currentWorkspace?.id);
  const categoriesQuery = useCategories(currentWorkspace?.id);
  const transactionsQuery = useAllTransactions(currentWorkspace?.id);
  const addTransaction = useAddTransaction();
  const workspaceId = currentWorkspace?.id;

  // El widget no puede mostrar un teclado, así que para el paso final del selector en vivo se
  // ofrecen los últimos montos usados en cada categoría como botones (más reciente primero, sin
  // duplicados, máximo 4). Solo se ofrecen categorías con al menos un movimiento previo.
  const categories = useMemo<WidgetCategory[]>(() => {
    const transactions = transactionsQuery.data ?? [];
    const cats = categoriesQuery.data ?? [];
    return cats
      .filter((c) => c.type === 'gasto' || c.type === 'ingreso')
      .map((c) => {
        const amounts: number[] = [];
        for (const t of transactions) {
          if (t.category_id !== c.id) continue;
          if (!amounts.includes(t.amount)) amounts.push(t.amount);
          if (amounts.length >= 4) break;
        }
        return amounts.length > 0
          ? { id: c.id, name: c.name, type: c.type as 'gasto' | 'ingreso', recentAmounts: amounts }
          : null;
      })
      .filter((c): c is WidgetCategory => c !== null);
  }, [categoriesQuery.data, transactionsQuery.data]);

  useEffect(() => {
    if (!currentWorkspace || isLoading) return;
    pushWidgetData({
      workspaceName: currentWorkspace.name,
      totalBalance: total,
      presets,
      categories,
    });
  }, [currentWorkspace, total, isLoading, presets, categories]);

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
