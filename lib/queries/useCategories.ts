import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { categoryColorForIndex } from '@/lib/categoryColor';
import { isDemoMode } from '@/lib/config';
import { mockStore } from '@/lib/mock/store';
import { supabase } from '@/lib/supabase';
import { Category, EntryType } from '@/types/database';

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
    // `existingCountOfType` = cuántas categorías de ese mismo tipo ya existen en el workspace;
    // determina el color asignado (ver lib/categoryColor.ts) para que nunca se repita.
    mutationFn: async ({
      name,
      type,
      existingCountOfType,
    }: {
      name: string;
      type: EntryType;
      existingCountOfType: number;
    }) => {
      if (!workspaceId) throw new Error('No hay workspace seleccionado');
      const color = categoryColorForIndex(existingCountOfType);
      if (isDemoMode) {
        mockStore.addCategory(workspaceId, name, type, color);
        return;
      }
      const { error } = await supabase.from('categories').insert({
        workspace_id: workspaceId,
        name,
        type,
        color,
        icon: 'shape',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', workspaceId] });
    },
  });
}

export function useUpdateCategoryFixed(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, isFixed }: { categoryId: string; isFixed: boolean }) => {
      if (isDemoMode) {
        mockStore.setCategoryFixed(categoryId, isFixed);
        return;
      }
      const { error } = await supabase.from('categories').update({ is_fixed: isFixed }).eq('id', categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', workspaceId] });
    },
  });
}

export function useUpdateCategory(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) => {
      if (isDemoMode) {
        mockStore.updateCategory(categoryId, name);
        return;
      }
      const { error } = await supabase.from('categories').update({ name }).eq('id', categoryId);
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
