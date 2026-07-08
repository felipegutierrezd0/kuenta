import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isDemoMode } from '@/lib/config';
import { mockStore } from '@/lib/mock/store';
import { supabase } from '@/lib/supabase';
import { Receivable, ReceivableDirection, ReceivableStatus } from '@/types/database';

export function useReceivables(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['receivables', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<Receivable[]> => {
      if (isDemoMode) return mockStore.getReceivables(workspaceId!);
      const { data, error } = await supabase
        .from('receivables')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as Receivable[];
    },
  });
}

export function useAddReceivable(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      direction: ReceivableDirection;
      counterparty: string;
      amount: number;
      dueDate: string | null;
    }) => {
      if (!workspaceId) throw new Error('No hay workspace seleccionado');
      if (isDemoMode) {
        mockStore.addReceivable({ workspaceId, ...input });
        return;
      }
      const { error } = await supabase.from('receivables').insert({
        workspace_id: workspaceId,
        direction: input.direction,
        counterparty: input.counterparty,
        amount: input.amount,
        due_date: input.dueDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables', workspaceId] });
    },
  });
}

export function useUpdateReceivableStatus(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ receivableId, status }: { receivableId: string; status: ReceivableStatus }) => {
      if (isDemoMode) {
        mockStore.updateReceivableStatus(receivableId, status);
        return;
      }
      const { error } = await supabase.from('receivables').update({ status }).eq('id', receivableId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables', workspaceId] });
    },
  });
}

export function useDeleteReceivable(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (receivableId: string) => {
      if (isDemoMode) {
        mockStore.deleteReceivable(receivableId);
        return;
      }
      const { error } = await supabase.from('receivables').delete().eq('id', receivableId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables', workspaceId] });
    },
  });
}
