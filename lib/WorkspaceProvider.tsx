import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';

import { useAuth } from '@/lib/AuthProvider';
import { isDemoMode } from '@/lib/config';
import { mockStore } from '@/lib/mock/store';
import { supabase } from '@/lib/supabase';
import { Workspace, WorkspaceType } from '@/types/database';

const CURRENT_WORKSPACE_KEY = 'current-workspace-id';

interface WorkspaceContextValue {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string, type: WorkspaceType) => Promise<void>;
  renameWorkspace: (workspaceId: string, name: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      if (isDemoMode) return mockStore.getWorkspaces();
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Workspace[];
    },
  });

  useEffect(() => {
    AsyncStorage.getItem(CURRENT_WORKSPACE_KEY).then((storedId) => {
      setCurrentWorkspaceId(storedId);
      setRestored(true);
    });
  }, []);

  useEffect(() => {
    if (!restored || workspaces.length === 0) return;
    const stillExists = workspaces.some((w) => w.id === currentWorkspaceId);
    if (!currentWorkspaceId || !stillExists) {
      setCurrentWorkspaceId(workspaces[0].id);
      AsyncStorage.setItem(CURRENT_WORKSPACE_KEY, workspaces[0].id);
    }
  }, [restored, workspaces, currentWorkspaceId]);

  async function switchWorkspace(workspaceId: string) {
    setCurrentWorkspaceId(workspaceId);
    await AsyncStorage.setItem(CURRENT_WORKSPACE_KEY, workspaceId);
  }

  async function createWorkspace(name: string, type: WorkspaceType) {
    if (isDemoMode) {
      const newId = mockStore.createWorkspace(name, type);
      await queryClient.invalidateQueries({ queryKey: ['workspaces', session?.user.id] });
      await switchWorkspace(newId);
      return;
    }
    const { data: newId, error } = await supabase.rpc('create_workspace', {
      p_name: name,
      p_type: type,
    });
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['workspaces', session?.user.id] });
    if (newId) await switchWorkspace(newId as string);
  }

  async function renameWorkspace(workspaceId: string, name: string) {
    if (isDemoMode) {
      mockStore.renameWorkspace(workspaceId, name);
      await queryClient.invalidateQueries({ queryKey: ['workspaces', session?.user.id] });
      return;
    }
    const { error } = await supabase.from('workspaces').update({ name }).eq('id', workspaceId);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['workspaces', session?.user.id] });
  }

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0] ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        loading: isLoading || !restored,
        switchWorkspace,
        createWorkspace,
        renameWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace debe usarse dentro de <WorkspaceProvider>');
  return ctx;
}
