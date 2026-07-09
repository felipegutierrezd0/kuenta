import { useMemo } from 'react';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';

import { useBudgets } from '@/lib/queries/useBudgets';
import { useSavingsGoals } from '@/lib/queries/useSavingsGoals';
import { useTransactions } from '@/lib/queries/useTransactions';

// Ventana de datos compartida por Consejos y el Chat: mes actual + 3 meses completos anteriores.
export function useFinancialData(workspaceId: string | undefined) {
  const today = useMemo(() => new Date(), []);
  const rangeStart = useMemo(() => format(startOfMonth(subMonths(today, 3)), 'yyyy-MM-dd'), [today]);
  const rangeEnd = useMemo(() => format(endOfMonth(today), 'yyyy-MM-dd'), [today]);

  const transactionsQuery = useTransactions({ workspaceId, monthStart: rangeStart, monthEnd: rangeEnd });
  const budgetsQuery = useBudgets(workspaceId);
  const savingsGoalsQuery = useSavingsGoals(workspaceId);

  return { today, transactionsQuery, budgetsQuery, savingsGoalsQuery };
}
