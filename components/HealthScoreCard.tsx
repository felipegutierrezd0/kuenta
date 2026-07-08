import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { FinancialHealthScore } from '@/lib/insights/metrics';
import { useColors } from '@/lib/ThemeProvider';

function scoreColor(score: number, colors: ThemeColors) {
  if (score >= 75) return colors.ingreso;
  if (score >= 50) return colors.warning;
  return colors.gasto;
}

export function HealthScoreCard({ health }: { health: FinancialHealthScore }) {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const color = scoreColor(health.score, colors);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.label}>Salud financiera</Text>
          <Text style={[styles.score, { color }]}>{health.score}/100</Text>
        </View>
        <View style={[styles.scoreRing, { borderColor: color }]}>
          <Text style={[styles.scoreRingText, { color }]}>{health.score}</Text>
        </View>
      </View>

      {health.breakdown.map((item) => (
        <View key={item.label} style={styles.row}>
          <Text style={styles.itemLabel}>{item.label}</Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${(item.points / item.max) * 100}%`, backgroundColor: scoreColor((item.points / item.max) * 100, colors) },
              ]}
            />
          </View>
          <Text style={styles.itemPoints}>
            {item.points}/{item.max}
          </Text>
        </View>
      ))}
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
      gap: 12,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontSize: 13, color: colors.textMuted },
    score: { fontSize: 24, fontWeight: '700', marginTop: 2 },
    scoreRing: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scoreRingText: { fontSize: 15, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemLabel: { fontSize: 12, color: colors.text, width: 130 },
    track: { flex: 1, height: 6, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 999 },
    itemPoints: { fontSize: 11, color: colors.textMuted, width: 40, textAlign: 'right' },
  });
