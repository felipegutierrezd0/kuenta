// Modo demo: la app funciona con datos falsos en memoria, sin necesitar un backend real.
// Se activa mientras no haya credenciales reales de Supabase en .env.
export const isDemoMode = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

export const DEMO_USER_ID = 'demo-user';
