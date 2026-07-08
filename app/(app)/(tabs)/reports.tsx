import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, typeLabels } from '@/constants/theme';
import { monthRange } from '@/lib/dateRange';
import { formatCurrency } from '@/lib/format';
import { useCategoryBreakdown, useMonthlyTrend } from '@/lib/queries/useReports';
import { useWorkspace } from '@/lib/WorkspaceProvider';
import { EntryType } from '@/types/database';

const BREAKDOWN_TYPES: EntryType[] = ['gasto', 'ingreso', 'ahorro'];

export default function ReportsScreen() {
  const { currentWorkspace } = useWorkspace();
  const [breakdownType, setBreakdownType] = useState<EntryType>('gasto');
  const { start, end } = useMemo(() => monthRange(new Date()), []);

  const breakdownQuery = useCategoryBreakdown(currentWorkspace?.id, start, end, breakdownType);
  const trendQuery = useMonthlyTrend(currentWorkspace?.id, 6);

  const pieData = (breakdownQuery.data ?? []).map((item) => ({
    value: item.total,
    color: item.color,
    text: item.total > 0 ? item.name : '',
  }));

  const totalBreakdown = (breakdownQuery.data ?? []).reduce((sum, item) => sum + item.total, 0);

  const barData = useMemo(() => {
    const months = trendQuery.data ?? [];
    const items: { value: number; frontColor: string; label?: string; spacing?: number }[] = [];
    months.forEach((month, idx) => {
      const isLastInGroup = idx === months.length - 1;
      items.push({ value: month.ingresos, frontColor: colors.ingreso });
      items.push({ value: month.gastos, frontColor: colors.gasto, label: month.label });
      items.push({ value: month.ahorro, frontColor: colors.ahorro, spacing: isLastInGroup ? 4 : 20 });
    });
    return items;
  }, [trendQuery.data]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Reportes</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Este mes por categoría</Text>
          <View style={styles.typeRow}>
            {BREAKDOWN_TYPES.map((t) => (
              <Pressable
                key={t}
                style={[styles.typeChip, breakdownType === t && { backgroundColor: colors[t], borderColor: colors[t] }]}
                onPress={() => setBreakdownType(t)}
              >
                <Text style={[styles.typeChipText, breakdownType === t && { color: '#fff' }]}>{typeLabels[t]}</Text>
              </Pressable>
            ))}
          </View>

          {breakdownQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : pieData.length === 0 ? (
            <Text style={styles.empty}>Sin datos este mes todavía.</Text>
          ) : (
            <>
              <View style={styles.pieWrap}>
                <PieChart data={pieData} donut radius={90} innerRadius={55} innerCircleColor={colors.card} />
              </View>
              <View style={styles.legend}>
                {(breakdownQuery.data ?? []).map((item) => (
                  <View key={item.categoryId ?? item.name} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabel}>{item.name}</Text>
                    <Text style={styles.legendValue}>{formatCurrency(item.total)}</Text>
                    <Text style={styles.legendPercent}>
                      {totalBreakdown > 0 ? Math.round((item.total / totalBreakdown) * 100) : 0}%
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Últimos 6 meses</Text>
          <View style={styles.trendLegend}>
            <LegendDot color={colors.ingreso} label="Ingresos" />
            <LegendDot color={colors.gasto} label="Gastos" />
            <LegendDot color={colors.ahorro} label="Ahorro" />
          </View>
          {trendQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : (
            <BarChart
              data={barData}
              barWidth={10}
              spacing={4}
              initialSpacing={12}
              noOfSections={4}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={colors.border}
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 11 }}
              height={180}
              hideRules
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  pieWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  legend: {
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  legendPercent: {
    fontSize: 12,
    color: colors.textMuted,
    width: 36,
    textAlign: 'right',
  },
  trendLegend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 24,
  },
});
