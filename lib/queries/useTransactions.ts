import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/AuthProvider';
import { isDemoMode } from '@/lib/config';
import { mockStore } from '@/lib/mock/store';
import { supabase } from '@/lib/supabase';
import { EntryType, Transaction } from '@/types/database';

interface TransactionFilters {
  workspaceId: string | undefined;
  monthStart: string; // yyyy-MM-dd
  monthEnd: string; // yyyy-MM-dd
  type?: EntryType;
}

export function useTransactions({ workspaceId, monthStart, monthEnd, type }: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', workspaceId, monthStart, monthEnd, type],
    enabled: !!workspaceId,
    queryFn: async () => {
      if (isDemoMode) return mockStore.getTransactionsInRange(workspaceId!, monthStart, monthEnd, type);
      let query = supabase
        .from('transactions')
        .select('*, category:categories(*), account:accounts(*)')
        .eq('workspace_id', workspaceId)
        .gte('occurred_on', monthStart)
        .lte('occurred_on', monthEnd)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (type) query = query.eq('type', type);
      const { data, error } = await query;
      if (error) throw error;
      return data as Transaction[];
    },
  });
}

export function useAllTransactions(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['all-transactions', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      if (isDemoMode) return mockStore.getAllTransactions(workspaceId!);
      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(*), account:accounts(*)')
        .eq('workspace_id', workspaceId)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
  });
}

interface NewTransaction {
  workspaceId: string;
  type: EntryType;
  amount: number;
  categoryId: string | null;
  accountId?: string | null;
  note: string | null;
  occurredOn: string;
}

function invalidateWorkspaceData(queryClient: ReturnType<typeof useQueryClient>, workspaceId: string) {
  queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] });
  queryClient.invalidateQueries({ queryKey: ['monthly-summary', workspaceId] });
  queryClient.invalidateQueries({ queryKey: ['category-breakdown', workspaceId] });
  queryClient.invalidateQueries({ queryKey: ['monthly-trend', workspaceId] });
  queryClient.invalidateQueries({ queryKey: ['account-balances', workspaceId] });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: NewTransaction) => {
      if (isDemoMode) {
        mockStore.addTransaction(input);
        return;
      }
      if (!session) throw new Error('No hay sesión activa');
      const { error } = await supabase.from('transactions').insert({
        workspace_id: input.workspaceId,
        user_id: session.user.id,
        type: input.type,
        amount: input.amount,
        category_id: input.categoryId,
        account_id: input.accountId ?? null,
        note: input.note,
        occurred_on: input.occurredOn,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      invalidateWorkspaceData(queryClient, variables.workspaceId);
    },
  });
}

export function useDeleteTransaction(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      if (isDemoMode) {
        mockStore.deleteTransaction(transactionId);
        return;
      }
      const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (workspaceId) invalidateWorkspaceData(queryClient, workspaceId);
    },
  });
}
