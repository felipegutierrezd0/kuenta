import { useMemo } from 'react';

import { generateInsights, Insight } from '@/lib/insights/generateInsights';
import { useFinancialData } from '@/lib/queries/useFinancialData';

export function useInsights(workspaceId: string | undefined) {
  const { today, transactionsQuery, budgetsQuery, savingsGoalsQuery } = useFinancialData(workspaceId);

  const insights: Insight[] = useMemo(() => {
    if (!transactionsQuery.data) return [];
    return generateInsights(transactionsQuery.data, today, budgetsQuery.data ?? [], savingsGoalsQuery.data ?? []);
  }, [transactionsQuery.data, budgetsQuery.data, savingsGoalsQuery.data, today]);

  return {
    insights,
    isLoading: transactionsQuery.isLoading,
    isFetching: transactionsQuery.isFetching,
    refetch: () => {
      transactionsQuery.refetch();
      budgetsQuery.refetch();
      savingsGoalsQuery.refetch();
    },
  };
}
