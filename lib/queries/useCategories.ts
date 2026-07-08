import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isDemoMode } from '@/lib/config';
import { mockStore } from '@/lib/mock/store';
import { supabase } from '@/lib/supabase';
import { Category, EntryType } from '@/types/database';

const CATEGORY_COLORS: Record<EntryType, string> = {
  ingreso: '#16a34a',
  gasto: '#dc2626',
  ahorro: '#2563eb',
};

export function useCategories(workspaceId: string | undefined, type?: EntryType) {
  return useQuery({
    queryKey: ['categories', workspaceId, type],
    enabled: !!workspaceId,
    queryFn: async () => {
      if (isDemoMode) return mockStore.getCategories(workspaceId!, type);
      let query = supabase.from('categories').select('*').eq('workspace_id', workspaceId).order('name');
      if (type) query = query.eq('type', type);
      const { data, error } = await query;
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useAddCategory(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, type }: { name: string; type: EntryType }) => {
      if (!workspaceId) throw new Error('No hay workspace seleccionado');
      if (isDemoMode) {
        mockStore.addCategory(workspaceId, name, type);
        return;
      }
      const { error } = await supabase.from('categories').insert({
        workspace_id: workspaceId,
        name,
        type,
        color: CATEGORY_COLORS[type],
        icon: 'shape',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', workspaceId] });
    },
  });
}

export function useDeleteCategory(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      if (isDemoMode) {
        mockStore.deleteCategory(categoryId);
        return;
      }
      const { error } = await supabase.from('categories').delete().eq('id', categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', workspaceId] });
    },
  });
}
