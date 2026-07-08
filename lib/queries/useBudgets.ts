import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isDemoMode } from '@/lib/config';
import { mockStore } from '@/lib/mock/store';
import { supabase } from '@/lib/supabase';
import { Budget } from '@/types/database';

export function useBudgets(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['budgets', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<Budget[]> => {
      if (isDemoMode) return mockStore.getBudgets(workspaceId!);
      const { data, error } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return data as Budget[];
    },
  });
}

export function useUpsertBudget(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, monthlyLimit }: { categoryId: string; monthlyLimit: number }) => {
      if (!workspaceId) throw new Error('No hay workspace seleccionado');
      if (isDemoMode) {
        mockStore.upsertBudget(workspaceId, categoryId, monthlyLimit);
        return;
      }
      const { error } = await supabase
        .from('budgets')
        .upsert(
          { workspace_id: workspaceId, category_id: categoryId, monthly_limit: monthlyLimit },
          { onConflict: 'workspace_id,category_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', workspaceId] });
    },
  });
}

export function useDeleteBudget(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (budgetId: string) => {
      if (isDemoMode) {
        mockStore.deleteBudget(budgetId);
        return;
      }
      const { error } = await supabase.from('budgets').delete().eq('id', budgetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', workspaceId] });
    },
  });
}
