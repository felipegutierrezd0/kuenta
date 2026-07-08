import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useMemo } from 'react';

import { isDemoMode } from '@/lib/config';
import { buildMonthContext, computeCashflowForecast, computeFixedVsVariable } from '@/lib/insights/metrics';
import { mockStore } from '@/lib/mock/store';
import { useRecurringTransactions } from '@/lib/queries/useRecurringTransactions';
import { useAllTransactions } from '@/lib/queries/useTransactions';
import { supabase } from '@/lib/supabase';
import { EntryType } from '@/types/database';

export interface CategoryBreakdownItem {
  categoryId: string | null;
  name: string;
  color: string;
  total: number;
}

// Todas las categorías de un mismo tipo comparten el mismo color base (para íconos/botones),
// así que para que el gráfico de dona distinga cada categoría usamos una paleta de tonos por tipo.
const PALETTES: Record<EntryType, string[]> = {
  ingreso: ['#16a34a', '#4ade80', '#0d9488', '#65a30d', '#059669'],
  gasto: ['#dc2626', '#f97316', '#e11d48', '#f59e0b', '#b91c1c', '#fb7185'],
  ahorro: ['#2563eb', '#7c3aed', '#0891b2', '#6366f1', '#0ea5e9'],
};

export function useCategoryBreakdown(workspaceId: string | undefined, monthStart: string, monthEnd: string, type: EntryType) {
  return useQuery({
    queryKey: ['category-breakdown', workspaceId, monthStart, monthEnd, type],
    enabled: !!workspaceId,
    queryFn: async (): Promise<CategoryBreakdownItem[]> => {
      const rows = isDemoMode
        ? mockStore.getTransactionsInRange(workspaceId!, monthStart, monthEnd, type).map((t) => ({
            amount: t.amount,
            category: t.category ?? null,
          }))
        : await fetchBreakdownFromSupabase(workspaceId!, monthStart, monthEnd, type);

      const totals = new Map<string, CategoryBreakdownItem>();
      for (const row of rows) {
        const category = row.category;
        const key = category?.id ?? 'sin-categoria';
        const existing = totals.get(key);
        if (existing) {
          existing.total += row.amount;
        } else {
          totals.set(key, {
            categoryId: category?.id ?? null,
            name: category?.name ?? 'Sin categoría',
            color: category?.color ?? '#94a3b8',
            total: row.amount,
          });
        }
      }

      const palette = PALETTES[type];
      return Array.from(totals.values())
        .sort((a, b) => b.total - a.total)
        .map((item, index) => ({ ...item, color: palette[index % palette.length] }));
    },
  });
}

async function fetchBreakdownFromSupabase(workspaceId: string, monthStart: string, monthEnd: string, type: EntryType) {
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, category:categories(id, name, color)')
    .eq('workspace_id', workspaceId)
    .eq('type', type)
    .gte('occurred_on', monthStart)
    .lte('occurred_on', monthEnd);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    amount: row.amount,
    category: Array.isArray(row.category) ? row.category[0] : row.category,
  }));
}

export interface MonthlyTrendItem {
  month: string; // 'yyyy-MM'
  label: string; // 'ene', 'feb', ...
  ingresos: number;
  gastos: number;
  ahorro: number;
}

export function useMonthlyTrend(workspaceId: string | undefined, monthsBack = 6) {
  return useQuery({
    queryKey: ['monthly-trend', workspaceId, monthsBack],
    enabled: !!workspaceId,
    queryFn: async (): Promise<MonthlyTrendItem[]> => {
      const today = new Date();
      const rangeStart = startOfMonth(subMonths(today, monthsBack - 1));
      const rangeEnd = endOfMonth(today);
      const startStr = format(rangeStart, 'yyyy-MM-dd');
      const endStr = format(rangeEnd, 'yyyy-MM-dd');

      const rows = isDemoMode
        ? mockStore.getTransactionsInRange(workspaceId!, startStr, endStr)
        : await fetchTrendFromSupabase(workspaceId!, startStr, endStr);

      const months: MonthlyTrendItem[] = Array.from({ length: monthsBack }).map((_, i) => {
        const d = subMonths(today, monthsBack - 1 - i);
        return {
          month: format(d, 'yyyy-MM'),
          label: format(d, 'MMM'),
          ingresos: 0,
          gastos: 0,
          ahorro: 0,
        };
      });

      for (const row of rows) {
        const monthKey = row.occurred_on.slice(0, 7);
        const bucket = months.find((m) => m.month === monthKey);
        if (!bucket) continue;
        if (row.type === 'ingreso') bucket.ingresos += row.amount;
        else if (row.type === 'gasto') bucket.gastos += row.amount;
        else if (row.type === 'ahorro') bucket.ahorro += row.amount;
      }

      return months;
    },
  });
}

async function fetchTrendFromSupabase(workspaceId: string, startStr: string, endStr: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount, occurred_on')
    .eq('workspace_id', workspaceId)
    .gte('occurred_on', startStr)
    .lte('occurred_on', endStr);
  if (error) throw error;
  return data ?? [];
}

export function useCashflowForecast(workspaceId: string | undefined) {
  const transactionsQuery = useAllTransactions(workspaceId);
  const recurringQuery = useRecurringTransactions(workspaceId);

  const forecast = useMemo(() => {
    if (!transactionsQuery.data) return [];
    return computeCashflowForecast(transactionsQuery.data, recurringQuery.data ?? [], new Date());
  }, [transactionsQuery.data, recurringQuery.data]);

  return { data: forecast, isLoading: transactionsQuery.isLoading || recurringQuery.isLoading };
}

export function useFixedVsVariable(workspaceId: string | undefined) {
  const transactionsQuery = useAllTransactions(workspaceId);
  const recurringQuery = useRecurringTransactions(workspaceId);

  const result = useMemo(() => {
    if (!transactionsQuery.data) return null;
    const ctx = buildMonthContext(transactionsQuery.data, new Date());
    return computeFixedVsVariable(ctx, recurringQuery.data ?? []);
  }, [transactionsQuery.data, recurringQuery.data]);

  return { data: result, isLoading: transactionsQuery.isLoading || recurringQuery.isLoading };
}
