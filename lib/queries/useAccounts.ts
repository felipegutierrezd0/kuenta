import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { isDemoMode } from '@/lib/config';
import { mockStore } from '@/lib/mock/store';
import { supabase } from '@/lib/supabase';
import { useAllTransactions } from '@/lib/queries/useTransactions';
import { Account, AccountKind } from '@/types/database';

export function useAccounts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['accounts', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<Account[]> => {
      if (isDemoMode) return mockStore.getAccounts(workspaceId!);
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');
      if (error) throw error;
      return data as Account[];
    },
  });
}

export function useAddAccount(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      kind,
      initialBalance,
    }: {
      name: string;
      kind: AccountKind;
      initialBalance: number;
    }) => {
      if (!workspaceId) throw new Error('No hay workspace seleccionado');
      if (isDemoMode) {
        mockStore.addAccount(workspaceId, name, kind, initialBalance);
        return;
      }
      const { error } = await supabase.from('accounts').insert({
        workspace_id: workspaceId,
        name,
        kind,
        initial_balance: initialBalance,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
    },
  });
}

export function useDeleteAccount(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      if (isDemoMode) {
        mockStore.deleteAccount(accountId);
        return;
      }
      const { error } = await supabase.from('accounts').delete().eq('id', accountId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['account-balances', workspaceId] });
    },
  });
}

export interface AccountBalance extends Account {
  balance: number;
}

export function useAccountBalances(workspaceId: string | undefined) {
  const accountsQuery = useAccounts(workspaceId);
  const transactionsQuery = useAllTransactions(workspaceId);

  const balances = useMemo<AccountBalance[]>(() => {
    const accounts = accountsQuery.data ?? [];
    const transactions = transactionsQuery.data ?? [];
    return accounts.map((account) => {
      const delta = transactions
        .filter((t) => t.account_id === account.id)
        .reduce((sum, t) => sum + (t.type === 'gasto' ? -t.amount : t.amount), 0);
      return { ...account, balance: account.initial_balance + delta };
    });
  }, [accountsQuery.data, transactionsQuery.data]);

  return {
    data: balances,
    isLoading: accountsQuery.isLoading || transactionsQuery.isLoading,
  };
}
