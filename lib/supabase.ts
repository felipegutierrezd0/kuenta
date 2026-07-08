import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { isDemoMode } from '@/lib/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!isDemoMode && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Copia .env.example a .env y completa tus llaves de Supabase.'
  );
}

// En modo demo este cliente nunca se usa de verdad (todo pasa por lib/mock), pero debe existir para que el import no falle.
export const supabase = createClient(supabaseUrl ?? 'https://demo.supabase.co', supabaseAnonKey ?? 'demo-anon-key', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase necesita saber cuándo la app vuelve a primer plano para refrescar el token a tiempo.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
