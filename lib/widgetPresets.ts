import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { WidgetPreset } from '@/lib/widgetBridge';

const STORAGE_PREFIX = 'widget-presets-';
const MAX_PRESETS = 4;

function queryKey(workspaceId: string | undefined) {
  return ['widget-presets', workspaceId];
}

async function readPresets(workspaceId: string): Promise<WidgetPreset[]> {
  const raw = await AsyncStorage.getItem(STORAGE_PREFIX + workspaceId);
  return raw ? JSON.parse(raw) : [];
}

async function writePresets(workspaceId: string, presets: WidgetPreset[]): Promise<WidgetPreset[]> {
  await AsyncStorage.setItem(STORAGE_PREFIX + workspaceId, JSON.stringify(presets));
  return presets;
}

// Los accesos rápidos del widget viven en el dispositivo (no en Supabase): son configuración de
// ESTE teléfono, guardados por workspace para que "Personal" y "Mi Pyme" tengan los suyos.
//
// Se leen/escriben vía React Query (no useState local) porque tanto la pantalla de
// configuración como WidgetSync (que sincroniza los datos hacia el widget) montan su propia
// instancia de este hook; con useState cada una tendría su copia aislada y WidgetSync nunca se
// enteraría de un preset nuevo hasta reiniciar la app. React Query comparte el cache entre
// ambas instancias e invalida automáticamente tras cada mutación.
export function useWidgetPresets(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKey(workspaceId),
    enabled: !!workspaceId,
    queryFn: () => readPresets(workspaceId!),
  });

  const presets = query.data ?? [];

  const mutation = useMutation({
    mutationFn: (next: WidgetPreset[]) => writePresets(workspaceId!, next),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey(workspaceId), next);
    },
  });

  function addPreset(preset: Omit<WidgetPreset, 'id'>) {
    if (!workspaceId) return;
    mutation.mutate([...presets, { ...preset, id: `${Date.now()}` }].slice(-MAX_PRESETS));
  }

  function removePreset(id: string) {
    if (!workspaceId) return;
    mutation.mutate(presets.filter((p) => p.id !== id));
  }

  return { presets, loading: query.isLoading, addPreset, removePreset, maxPresets: MAX_PRESETS };
}
