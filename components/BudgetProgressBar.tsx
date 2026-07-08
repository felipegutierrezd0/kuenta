import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/lib/ThemeProvider';

export function BudgetProgressBar({ label, spent, limit }: { label: string; spent: number; limit: number }) {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const ratio = limit > 0 ? spent / limit : 0;
  const pct = Math.min(1, ratio);
  const barColor = ratio >= 1 ? colors.gasto : ratio >= 0.8 ? colors.warning : colors.ingreso;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.amounts}>
          {formatCurrency(spent)} <Text style={styles.limitText}>de {formatCurrency(limit)}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: { marginBottom: 14 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    label: { fontSize: 13, fontWeight: '600', color: colors.text },
    amounts: { fontSize: 12, color: colors.text, fontWeight: '600' },
    limitText: { color: colors.textMuted, fontWeight: '400' },
    track: { height: 8, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 999 },
  });
