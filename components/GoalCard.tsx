import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/lib/ThemeProvider';
import { SavingsGoal } from '@/types/database';

export function GoalCard({
  goal,
  onContribute,
  onDelete,
}: {
  goal: SavingsGoal;
  onContribute: (amount: number) => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [contributing, setContributing] = useState(false);
  const [amount, setAmount] = useState('');

  const pct = goal.target_amount > 0 ? Math.min(1, goal.saved_amount / goal.target_amount) : 0;

  function handleContribute() {
    const value = Number(amount.replace(',', '.'));
    if (!(value > 0)) return;
    onContribute(value);
    setAmount('');
    setContributing(false);
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{goal.name}</Text>
          {goal.target_date && (
            <Text style={styles.meta}>Meta: {format(parseISO(goal.target_date), "d 'de' MMMM yyyy", { locale: es })}</Text>
          )}
        </View>
        <Pressable onPress={onDelete} hitSlop={10}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
      <Text style={styles.amounts}>
        {formatCurrency(goal.saved_amount)} <Text style={styles.limitText}>de {formatCurrency(goal.target_amount)}</Text>
        {'  ·  '}
        {Math.round(pct * 100)}%
      </Text>

      {contributing ? (
        <View style={styles.inlineForm}>
          <TextInput
            style={styles.input}
            placeholder="Monto a aportar"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />
          <Pressable style={styles.iconButton} onPress={handleContribute}>
            <MaterialCommunityIcons name="check" size={18} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.contributeButton} onPress={() => setContributing(true)}>
          <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
          <Text style={styles.contributeText}>Aportar</Text>
        </Pressable>
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    name: { fontSize: 15, fontWeight: '700', color: colors.text },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    track: { height: 8, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden', marginBottom: 8 },
    fill: { height: '100%', borderRadius: 999, backgroundColor: colors.ahorro },
    amounts: { fontSize: 13, color: colors.text, fontWeight: '600', marginBottom: 12 },
    limitText: { color: colors.textMuted, fontWeight: '400' },
    contributeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 10,
    },
    contributeText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    inlineForm: { flexDirection: 'row', gap: 8 },
    input: {
      flex: 1,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
