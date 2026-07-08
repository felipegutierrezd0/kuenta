import { useMemo } from 'react';

import { computeFinancialHealthScore, FinancialHealthScore } from '@/lib/insights/metrics';
import { useFinancialData } from '@/lib/queries/useFinancialData';

export function useFinancialHealth(workspaceId: string | undefined) {
  const { today, transactionsQuery, debtsQuery, budgetsQuery } = useFinancialData(workspaceId);

  const health: FinancialHealthScore | null = useMemo(() => {
    if (!transactionsQuery.data) return null;
    return computeFinancialHealthScore(transactionsQuery.data, debtsQuery.data ?? [], budgetsQuery.data ?? [], today);
  }, [transactionsQuery.data, debtsQuery.data, budgetsQuery.data, today]);

  return {
    health,
    isLoading: transactionsQuery.isLoading || debtsQuery.isLoading || budgetsQuery.isLoading,
  };
}
