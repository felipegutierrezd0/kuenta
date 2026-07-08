import { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';

import { DEMO_USER_ID, isDemoMode } from '@/lib/config';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// En modo demo no hay backend real: cualquier correo/contraseña "inician sesión" con un usuario falso.
function createDemoSession(email: string): Session {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: DEMO_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  } as User;

  return {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user,
  } as Session;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setInitializing(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    if (isDemoMode) {
      setSession(createDemoSession(email));
      return null;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }

  async function signUp(email: string, password: string) {
    if (isDemoMode) {
      setSession(createDemoSession(email));
      return null;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    return error?.message ?? null;
  }

  async function signOut() {
    if (isDemoMode) {
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, initializing, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
