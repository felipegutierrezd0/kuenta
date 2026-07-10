import * as ImagePicker from 'expo-image-picker';

import { isDemoMode } from '@/lib/config';
import { supabase } from '@/lib/supabase';

// Deja elegir una foto de la galería y devuelve su URI local, o null si el usuario cancela
// o no concede permiso.
export async function pickReceiptImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}

// En modo demo no hay backend real, así que devolvemos la URI local tal cual (sirve para
// previsualizar en la sesión actual, no se conserva al recargar). En modo real se sube al bucket
// público "receipts" de Supabase Storage y se devuelve su URL pública.
export async function uploadReceiptImage(workspaceId: string, localUri: string): Promise<string> {
  if (isDemoMode) return localUri;

  const response = await fetch(localUri);
  const blob = await response.blob();
  const fileExt = localUri.split('.').pop()?.split('?')[0] || 'jpg';
  const path = `${workspaceId}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage.from('receipts').upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('receipts').getPublicUrl(path);
  return data.publicUrl;
}
