import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, addMonths, format } from 'date-fns';

import { isDemoMode } from '@/lib/config';
import { mockStore } from '@/lib/mock/store';
import { supabase } from '@/lib/supabase';
import { EntryType, RecurringFrequency, RecurringTransaction } from '@/types/database';

export function useRecurringTransactions(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['recurring-transactions', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<RecurringTransaction[]> => {
      if (isDemoMode) return mockStore.getRecurringTransactions(workspaceId!);
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*, category:categories(*)')
        .eq('workspace_id', workspaceId)
        .eq('active', true)
        .order('next_due_date', { ascending: true });
      if (error) throw error;
      return data as RecurringTransaction[];
    },
  });
}

export function useAddRecurring(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      type: EntryType;
      amount: number;
      categoryId: string | null;
      note: string | null;
      frequency: RecurringFrequency;
      nextDueDate: string;
    }) => {
      if (!workspaceId) throw new Error('No hay workspace seleccionado');
      if (isDemoMode) {
        mockStore.addRecurringTransaction({ workspaceId, ...input });
        return;
      }
      const { error } = await supabase.from('recurring_transactions').insert({
        workspace_id: workspaceId,
        type: input.type,
        amount: input.amount,
        category_id: input.categoryId,
        note: input.note,
        frequency: input.frequency,
        next_due_date: input.nextDueDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions', workspaceId] });
    },
  });
}

export function useDeleteRecurring(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recurringId: string) => {
      if (isDemoMode) {
        mockStore.deleteRecurringTransaction(recurringId);
        return;
      }
      const { error } = await supabase.from('recurring_transactions').delete().eq('id', recurringId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions', workspaceId] });
    },
  });
}

function advanceDate(current: string, frequency: RecurringFrequency): string {
  const date = new Date(`${current}T00:00:00`);
  if (frequency === 'semanal') return format(addDays(date, 7), 'yyyy-MM-dd');
  if (frequency === 'quincenal') return format(addDays(date, 15), 'yyyy-MM-dd');
  return format(addMonths(date, 1), 'yyyy-MM-dd');
}

export function useRegisterRecurringOccurrence(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recurring: RecurringTransaction) => {
      if (isDemoMode) {
        mockStore.registerRecurringOccurrence(recurring.id);
        return;
      }
      const { error: insertError } = await supabase.from('transactions').insert({
        workspace_id: recurring.workspace_id,
        type: recurring.type,
        amount: recurring.amount,
        category_id: recurring.category_id,
        note: recurring.note,
        occurred_on: recurring.next_due_date,
      });
      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('recurring_transactions')
        .update({ next_due_date: advanceDate(recurring.next_due_date, recurring.frequency) })
        .eq('id', recurring.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['category-breakdown', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['monthly-trend', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['account-balances', workspaceId] });
    },
  });
}
