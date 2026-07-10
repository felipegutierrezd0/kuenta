import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { confirmDestructive } from '@/lib/alert';
import { formatCurrency } from '@/lib/format';
import { useDeleteExpenseSplit, useExpenseSplits, useUpdateSplitPaid } from '@/lib/queries/useExpenseSplits';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';
import { ExpenseSplit } from '@/types/database';

export default function SplitsScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currentWorkspace } = useWorkspace();

  const splitsQuery = useExpenseSplits(currentWorkspace?.id);
  const updatePaid = useUpdateSplitPaid(currentWorkspace?.id);
  const deleteSplit = useDeleteExpenseSplit(currentWorkspace?.id);

  const splits = splitsQuery.data ?? [];
  const pending = splits.filter((s) => !s.paid);
  const totalPending = pending.reduce((sum, s) => sum + s.share_amount, 0);

  const byParticipant = new Map<string, number>();
  for (const s of pending) {
    byParticipant.set(s.participant_name, (byParticipant.get(s.participant_name) ?? 0) + s.share_amount);
  }

  function handleDelete(split: ExpenseSplit) {
    confirmDestructive('Eliminar parte', `¿Eliminar la parte de ${split.participant_name}?`, 'Eliminar', () =>
      deleteSplit.mutate(split.id)
    );
  }

  function renderSplit(s: ExpenseSplit) {
    const tx = s.transaction;
    return (
      <View key={s.id} style={styles.row}>
        <Pressable style={styles.checkbox} onPress={() => updatePaid.mutate({ splitId: s.id, paid: !s.paid })}>
          <MaterialCommunityIcons
            name={s.paid ? 'check-circle' : 'checkbox-blank-circle-outline'}
            size={22}
            color={s.paid ? colors.ingreso : colors.textMuted}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowName, s.paid && styles.rowNameDone]}>{s.participant_name}</Text>
          <Text style={styles.rowMeta}>
            {tx?.note || tx?.category?.name || 'Movimiento'}
            {tx?.occurred_on ? ` · ${format(parseISO(tx.occurred_on), "d 'de' MMM", { locale: es })}` : ''}
          </Text>
        </View>
        <Text style={[styles.amount, s.paid && styles.rowNameDone]}>{formatCurrency(s.share_amount)}</Text>
        <Pressable onPress={() => handleDelete(s)} hitSlop={10} style={{ marginLeft: 8 }}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Gastos compartidos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total pendiente por cobrar</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalPending)}</Text>
          {byParticipant.size > 0 && (
            <View style={{ gap: 4, marginTop: 4 }}>
              {Array.from(byParticipant.entries()).map(([name, amount]) => (
                <View key={name} style={styles.resultRow}>
                  <Text style={styles.rowMeta}>{name}</Text>
                  <Text style={styles.rowName}>{formatCurrency(amount)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Todas las partes</Text>
          {splits.length === 0 ? (
            <Text style={styles.hint}>
              Aún no has compartido ningún gasto. Al crear un movimiento de gasto, activa "Compartir con otras
              personas" para dividirlo.
            </Text>
          ) : (
            splits.map(renderSplit)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    content: { padding: 16, gap: 16, paddingBottom: 40 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    totalAmount: { fontSize: 24, fontWeight: '700', color: colors.text },
    hint: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
    resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    checkbox: { marginRight: 10 },
    rowName: { fontSize: 14, fontWeight: '600', color: colors.text },
    rowNameDone: { textDecorationLine: 'line-through', color: colors.textMuted },
    rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    amount: { fontSize: 14, fontWeight: '700', color: colors.text },
  });
