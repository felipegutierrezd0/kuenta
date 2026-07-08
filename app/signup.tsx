import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from '@/constants/theme';
import { isDemoMode } from '@/lib/config';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const { session, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  if (session) return <Redirect href="/(app)/(tabs)" />;

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const message = await signUp(email.trim(), password);
    setLoading(false);
    if (message) {
      setError(message);
      return;
    }
    if (isDemoMode) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Revisa tu correo</Text>
        <Text style={styles.subtitle}>
          Te enviamos un enlace de confirmación a {email}. Ábrelo para activar tu cuenta y luego inicia sesión.
        </Text>
        <Link href="/login" style={styles.link}>
          <Text style={styles.linkText}>Ir a iniciar sesión</Text>
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Image source={require('@/assets/images/logo-full.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Crea tu cuenta</Text>
      <Text style={styles.subtitle}>Para uso personal o de tu pyme</Text>

      {isDemoMode && (
        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeText}>Modo demo: regístrate con cualquier correo y contraseña</Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña (mínimo 6 caracteres)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading || !email || password.length < 6}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Registrarme</Text>}
      </Pressable>

      <Link href="/login" style={styles.link}>
        <Text style={styles.linkText}>¿Ya tienes cuenta? Entra</Text>
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  logo: {
    width: 150,
    height: 184,
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 32,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: colors.gasto,
    marginBottom: 8,
    textAlign: 'center',
  },
  link: {
    marginTop: 24,
    alignSelf: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
  },
  demoBadge: {
    backgroundColor: colors.ahorroBg,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  demoBadgeText: {
    color: colors.ahorro,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
