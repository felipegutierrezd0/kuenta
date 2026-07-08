import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import { useRegisterRecurringOccurrence } from '@/lib/queries/useRecurringTransactions';
import { useColors } from '@/lib/ThemeProvider';
import { RecurringTransaction } from '@/types/database';

export function RecurringDueBanner({
  recurring,
  workspaceId,
}: {
  recurring: RecurringTransaction[];
  workspaceId: string | undefined;
}) {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const registerOccurrence = useRegisterRecurringOccurrence(workspaceId);

  const today = format(new Date(), 'yyyy-MM-dd');
  const due = recurring.filter((r) => r.next_due_date <= today);

  if (due.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name="calendar-clock-outline" size={18} color={colors.warning} />
        <Text style={styles.title}>
          {due.length === 1 ? 'Tienes 1 movimiento recurrente pendiente' : `Tienes ${due.length} movimientos recurrentes pendientes`}
        </Text>
      </View>
      {due.map((r) => (
        <View key={r.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{r.note ?? r.category?.name ?? 'Movimiento recurrente'}</Text>
            <Text style={styles.meta}>{formatCurrency(r.amount)}</Text>
          </View>
          <Pressable
            style={styles.registerButton}
            onPress={() => registerOccurrence.mutate(r)}
            disabled={registerOccurrence.isPending}
          >
            {registerOccurrence.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.registerText}>Registrar</Text>
            )}
          </Pressable>
        </View>
      ))}
      <Pressable onPress={() => router.push('/(app)/recurring')} hitSlop={8}>
        <Text style={styles.link}>Ver todos los recurrentes</Text>
      </Pressable>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.warningBg,
      borderRadius: 16,
      padding: 16,
      gap: 10,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    title: { fontSize: 13, fontWeight: '700', color: colors.text, flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center' },
    name: { fontSize: 13, fontWeight: '600', color: colors.text },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    registerButton: {
      backgroundColor: colors.warning,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      minWidth: 84,
      alignItems: 'center',
    },
    registerText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    link: { fontSize: 12, fontWeight: '600', color: colors.primary, marginTop: 2 },
  });
