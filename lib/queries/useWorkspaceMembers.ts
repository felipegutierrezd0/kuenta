import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isDemoMode } from '@/lib/config';
import { mockStore } from '@/lib/mock/store';
import { supabase } from '@/lib/supabase';
import { WorkspaceInvite, WorkspaceMember } from '@/types/database';

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<WorkspaceMember[]> => {
      if (isDemoMode) return mockStore.getWorkspaceMembers(workspaceId!);
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return data as WorkspaceMember[];
    },
  });
}

export function usePendingInvites(email: string | undefined) {
  return useQuery({
    queryKey: ['pending-invites', email],
    enabled: !!email,
    queryFn: async (): Promise<WorkspaceInvite[]> => {
      if (isDemoMode) return mockStore.getPendingInvites(email!);
      const { data, error } = await supabase
        .from('workspace_invites')
        .select('*, workspace:workspaces(*)')
        .eq('email', email);
      if (error) throw error;
      return data as WorkspaceInvite[];
    },
  });
}

export function useInviteMember(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'member' }) => {
      if (!workspaceId) throw new Error('No hay workspace seleccionado');
      if (isDemoMode) {
        mockStore.inviteMember(workspaceId, email, role);
        return;
      }
      const { error } = await supabase.from('workspace_invites').insert({
        workspace_id: workspaceId,
        email,
        role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invites', workspaceId] });
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      if (isDemoMode) {
        mockStore.acceptInvite(inviteId);
        return;
      }
      const { error } = await supabase.rpc('accept_workspace_invite', { p_invite_id: inviteId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
    },
  });
}
