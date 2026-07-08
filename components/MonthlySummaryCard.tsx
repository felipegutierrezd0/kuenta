import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/lib/ThemeProvider';
import { MonthlySummary } from '@/types/database';

export function MonthlySummaryCard({ summary, monthLabel }: { summary: MonthlySummary; monthLabel: string }) {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <Text style={styles.month}>{monthLabel}</Text>
      <Text style={styles.balanceLabel}>Balance del mes</Text>
      <Text style={[styles.balance, { color: summary.balance >= 0 ? colors.ingreso : colors.gasto }]}>
        {formatCurrency(summary.balance)}
      </Text>

      <View style={styles.row}>
        <SummaryStat label="Ingresos" value={summary.ingresos} color={colors.ingreso} />
        <SummaryStat label="Gastos" value={summary.gastos} color={colors.gasto} />
        <SummaryStat label="Ahorro" value={summary.ahorro} color={colors.ahorro} />
      </View>
    </View>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: number; color: string }) {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{formatCurrency(value)}</Text>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  month: {
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  balanceLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 10,
  },
  balance: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
});
