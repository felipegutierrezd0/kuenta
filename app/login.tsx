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
import { useAuth } from '@/lib/AuthProvider';
import { isDemoMode } from '@/lib/config';

export default function LoginScreen() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Redirect href="/(app)/(tabs)" />;

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const message = await signIn(email.trim(), password);
    setLoading(false);
    if (message) setError(message);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Image source={require('@/assets/images/logo-full.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Bienvenido de vuelta</Text>
      <Text style={styles.subtitle}>Controla tus ingresos, gastos y ahorros</Text>

      {isDemoMode && (
        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeText}>Modo demo: entra con cualquier correo y contraseña</Text>
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
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading || !email || !password}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
      </Pressable>

      <Link href="/signup" style={styles.link}>
        <Text style={styles.linkText}>¿No tienes cuenta? Regístrate</Text>
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
