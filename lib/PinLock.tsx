import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, useContext, useEffect, useMemo, useState, PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useColors } from '@/lib/ThemeProvider';

const PIN_HASH_KEY = 'app-pin-hash';
const PIN_LENGTH = 4;

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

interface PinLockContextValue {
  hasPin: boolean;
  loading: boolean;
  setPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;
}

const PinLockContext = createContext<PinLockContextValue | undefined>(undefined);

export function PinLockProvider({ children }: PropsWithChildren) {
  const [pinHash, setPinHashState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PIN_HASH_KEY).then((stored) => {
      setPinHashState(stored);
      setLocked(!!stored);
      setLoading(false);
    });
  }, []);

  async function setPin(pin: string) {
    const hash = await hashPin(pin);
    await AsyncStorage.setItem(PIN_HASH_KEY, hash);
    setPinHashState(hash);
  }

  async function removePin() {
    await AsyncStorage.removeItem(PIN_HASH_KEY);
    setPinHashState(null);
    setLocked(false);
  }

  async function tryUnlock(pin: string): Promise<boolean> {
    const hash = await hashPin(pin);
    if (pinHash && hash === pinHash) {
      setLocked(false);
      return true;
    }
    return false;
  }

  const value = useMemo(() => ({ hasPin: !!pinHash, loading, setPin, removePin }), [pinHash, loading]);

  if (loading) return null;

  return (
    <PinLockContext.Provider value={value}>
      {locked && pinHash ? <PinEntryScreen onUnlock={tryUnlock} /> : children}
    </PinLockContext.Provider>
  );
}

export function usePinLock() {
  const ctx = useContext(PinLockContext);
  if (!ctx) throw new Error('usePinLock debe usarse dentro de <PinLockProvider>');
  return ctx;
}

function PinEntryScreen({ onUnlock }: { onUnlock: (pin: string) => Promise<boolean> }) {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  async function handleDigit(d: string) {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === PIN_LENGTH) {
      const ok = await onUnlock(next);
      if (!ok) {
        setError(true);
        setTimeout(() => setPin(''), 300);
      }
    }
  }

  function handleBackspace() {
    setPin((p) => p.slice(0, -1));
  }

  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="lock-outline" size={30} color={colors.primary} />
        </View>
        <Text style={styles.title}>Kuenta bloqueada</Text>
        <Text style={styles.subtitle}>Ingresa tu PIN para continuar</Text>
        <View style={styles.dotsRow}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled, error && styles.dotError]} />
          ))}
        </View>
        {error && <Text style={styles.error}>PIN incorrecto</Text>}

        <View style={styles.keypad}>
          {KEYS.map((k, idx) =>
            k === '' ? (
              <View key={idx} style={styles.keypadKey} />
            ) : (
              <Pressable
                key={idx}
                style={styles.keypadKey}
                onPress={() => (k === 'back' ? handleBackspace() : handleDigit(k))}
              >
                {k === 'back' ? (
                  <MaterialCommunityIcons name="backspace-outline" size={22} color={colors.text} />
                ) : (
                  <Text style={styles.keypadText}>{k}</Text>
                )}
              </Pressable>
            )
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    iconWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.ahorroBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 24 },
    dotsRow: { flexDirection: 'row', gap: 14, marginBottom: 12 },
    dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.border },
    dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
    dotError: { backgroundColor: colors.gasto, borderColor: colors.gasto },
    error: { color: colors.gasto, fontSize: 13, marginBottom: 12 },
    keypad: {
      marginTop: 20,
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: 240,
      justifyContent: 'space-between',
    },
    keypadKey: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    keypadText: { fontSize: 24, fontWeight: '600', color: colors.text },
  });
