import { useMemo } from 'react';

import { generateInsights, Insight } from '@/lib/insights/generateInsights';
import { useFinancialData } from '@/lib/queries/useFinancialData';

export function useInsights(workspaceId: string | undefined) {
  const { today, transactionsQuery, debtsQuery } = useFinancialData(workspaceId);

  const insights: Insight[] = useMemo(() => {
    if (!transactionsQuery.data) return [];
    return generateInsights(transactionsQuery.data, debtsQuery.data ?? [], today);
  }, [transactionsQuery.data, debtsQuery.data, today]);

  return {
    insights,
    isLoading: transactionsQuery.isLoading || debtsQuery.isLoading,
    isFetching: transactionsQuery.isFetching || debtsQuery.isFetching,
    refetch: () => {
      transactionsQuery.refetch();
      debtsQuery.refetch();
    },
  };
}
