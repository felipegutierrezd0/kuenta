import { useMemo } from 'react';

import { computeFinancialHealthScore, FinancialHealthScore } from '@/lib/insights/metrics';
import { useFinancialData } from '@/lib/queries/useFinancialData';

export function useFinancialHealth(workspaceId: string | undefined) {
  const { today, transactionsQuery, budgetsQuery } = useFinancialData(workspaceId);

  const health: FinancialHealthScore | null = useMemo(() => {
    if (!transactionsQuery.data) return null;
    return computeFinancialHealthScore(transactionsQuery.data, budgetsQuery.data ?? [], today);
  }, [transactionsQuery.data, budgetsQuery.data, today]);

  return {
    health,
    isLoading: transactionsQuery.isLoading || budgetsQuery.isLoading,
  };
}
