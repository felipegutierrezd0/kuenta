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

function netOfTransactions(transactions: { type: string; amount: number }[]) {
  return transactions.reduce((sum, t) => sum + (t.type === 'gasto' ? -t.amount : t.amount), 0);
}

// Saldo total real del workspace: suma de todas las cuentas más lo que no está
// asignado a ninguna cuenta ("Sin cuenta"), para que ningún movimiento se pierda del total.
export function useAccountBalances(workspaceId: string | undefined) {
  const accountsQuery = useAccounts(workspaceId);
  const transactionsQuery = useAllTransactions(workspaceId);

  const result = useMemo(() => {
    const accounts = accountsQuery.data ?? [];
    const transactions = transactionsQuery.data ?? [];
    const balances: AccountBalance[] = accounts.map((account) => ({
      ...account,
      balance: account.initial_balance + netOfTransactions(transactions.filter((t) => t.account_id === account.id)),
    }));
    const sinCuentaBalance = netOfTransactions(transactions.filter((t) => !t.account_id));
    const total = balances.reduce((sum, a) => sum + a.balance, 0) + sinCuentaBalance;
    return { balances, sinCuentaBalance, total };
  }, [accountsQuery.data, transactionsQuery.data]);

  return {
    data: result.balances,
    sinCuentaBalance: result.sinCuentaBalance,
    total: result.total,
    isLoading: accountsQuery.isLoading || transactionsQuery.isLoading,
  };
}
