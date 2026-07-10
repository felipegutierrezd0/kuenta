import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isDemoMode } from '@/lib/config';
import { mockStore } from '@/lib/mock/store';
import { supabase } from '@/lib/supabase';
import { ExpenseSplit } from '@/types/database';

export function useExpenseSplits(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['expense-splits', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<ExpenseSplit[]> => {
      if (isDemoMode) return mockStore.getExpenseSplits(workspaceId!);
      const { data, error } = await supabase
        .from('expense_splits')
        .select('*, transaction:transactions(*, category:categories(*))')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ExpenseSplit[];
    },
  });
}

export function useAddExpenseSplits(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      splits,
    }: {
      transactionId: string;
      splits: { participantName: string; shareAmount: number }[];
    }) => {
      if (!workspaceId) throw new Error('No hay workspace seleccionado');
      if (isDemoMode) {
        mockStore.addExpenseSplits(transactionId, workspaceId, splits);
        return;
      }
      const { error } = await supabase.from('expense_splits').insert(
        splits.map((s) => ({
          transaction_id: transactionId,
          workspace_id: workspaceId,
          participant_name: s.participantName,
          share_amount: s.shareAmount,
        }))
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-splits', workspaceId] });
    },
  });
}

export function useUpdateSplitPaid(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ splitId, paid }: { splitId: string; paid: boolean }) => {
      if (isDemoMode) {
        mockStore.updateSplitPaid(splitId, paid);
        return;
      }
      const { error } = await supabase.from('expense_splits').update({ paid }).eq('id', splitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-splits', workspaceId] });
    },
  });
}

export function useDeleteExpenseSplit(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (splitId: string) => {
      if (isDemoMode) {
        mockStore.deleteExpenseSplit(splitId);
        return;
      }
      const { error } = await supabase.from('expense_splits').delete().eq('id', splitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-splits', workspaceId] });
    },
  });
}
