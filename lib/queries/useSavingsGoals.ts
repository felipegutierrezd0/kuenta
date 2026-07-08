import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isDemoMode } from '@/lib/config';
import { mockStore } from '@/lib/mock/store';
import { supabase } from '@/lib/supabase';
import { SavingsGoal } from '@/types/database';

export function useSavingsGoals(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['savings-goals', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<SavingsGoal[]> => {
      if (isDemoMode) return mockStore.getSavingsGoals(workspaceId!);
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as SavingsGoal[];
    },
  });
}

export function useAddSavingsGoal(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      targetAmount,
      targetDate,
    }: {
      name: string;
      targetAmount: number;
      targetDate: string | null;
    }) => {
      if (!workspaceId) throw new Error('No hay workspace seleccionado');
      if (isDemoMode) {
        mockStore.addSavingsGoal(workspaceId, name, targetAmount, targetDate);
        return;
      }
      const { error } = await supabase.from('savings_goals').insert({
        workspace_id: workspaceId,
        name,
        target_amount: targetAmount,
        target_date: targetDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals', workspaceId] });
    },
  });
}

export function useContributeToGoal(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, amount, savedAmount }: { goalId: string; amount: number; savedAmount: number }) => {
      if (isDemoMode) {
        mockStore.contributeToGoal(goalId, amount);
        return;
      }
      const { error } = await supabase
        .from('savings_goals')
        .update({ saved_amount: savedAmount + amount })
        .eq('id', goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals', workspaceId] });
    },
  });
}

export function useDeleteSavingsGoal(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      if (isDemoMode) {
        mockStore.deleteSavingsGoal(goalId);
        return;
      }
      const { error } = await supabase.from('savings_goals').delete().eq('id', goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals', workspaceId] });
    },
  });
}
