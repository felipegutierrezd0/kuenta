import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isDemoMode } from '@/lib/config';
import { mockStore } from '@/lib/mock/store';
import { supabase } from '@/lib/supabase';
import { Debt } from '@/types/database';

export function useDebts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['debts', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<Debt[]> => {
      if (isDemoMode) return mockStore.getDebts(workspaceId!);
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('interest_rate', { ascending: false });
      if (error) throw error;
      return data as Debt[];
    },
  });
}

export function useAddDebt(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, balance, interestRate }: { name: string; balance: number; interestRate: number }) => {
      if (!workspaceId) throw new Error('No hay workspace seleccionado');
      if (isDemoMode) {
        mockStore.addDebt(workspaceId, name, balance, interestRate);
        return;
      }
      const { error } = await supabase.from('debts').insert({
        workspace_id: workspaceId,
        name,
        balance,
        interest_rate: interestRate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', workspaceId] });
    },
  });
}

export function useDeleteDebt(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (debtId: string) => {
      if (isDemoMode) {
        mockStore.deleteDebt(debtId);
        return;
      }
      const { error } = await supabase.from('debts').delete().eq('id', debtId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', workspaceId] });
    },
  });
}
