import { useQuery } from '@tanstack/react-query';

import { isDemoMode } from '@/lib/config';
import { mockStore } from '@/lib/mock/store';
import { supabase } from '@/lib/supabase';
import { MonthlySummary } from '@/types/database';

function summarize(rows: { type: string; amount: number }[]): MonthlySummary {
  const summary = rows.reduce(
    (acc, row) => {
      if (row.type === 'ingreso') acc.ingresos += row.amount;
      else if (row.type === 'gasto') acc.gastos += row.amount;
      else if (row.type === 'ahorro') acc.ahorro += row.amount;
      return acc;
    },
    { ingresos: 0, gastos: 0, ahorro: 0, balance: 0 }
  );
  summary.balance = summary.ingresos - summary.gastos - summary.ahorro;
  return summary;
}

export function useMonthlySummary(workspaceId: string | undefined, monthStart: string, monthEnd: string) {
  return useQuery({
    queryKey: ['monthly-summary', workspaceId, monthStart, monthEnd],
    enabled: !!workspaceId,
    queryFn: async (): Promise<MonthlySummary> => {
      if (isDemoMode) return summarize(mockStore.getTransactionsInRange(workspaceId!, monthStart, monthEnd));

      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('workspace_id', workspaceId)
        .gte('occurred_on', monthStart)
        .lte('occurred_on', monthEnd);
      if (error) throw error;
      return summarize(data ?? []);
    },
  });
}
