import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { notify } from '@/lib/alert';
import { formatCurrency } from '@/lib/format';
import { useAllTransactions } from '@/lib/queries/useTransactions';
import { computeAnnualSummary, exportAnnualSummaryPdf } from '@/lib/taxSummary';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function TaxSummaryScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currentWorkspace } = useWorkspace();
  const [year, setYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);

  const transactionsQuery = useAllTransactions(currentWorkspace?.id);
  const summary = useMemo(
    () => computeAnnualSummary(transactionsQuery.data ?? [], year),
    [transactionsQuery.data, year]
  );

  async function handleExport() {
    setExporting(true);
    try {
      await exportAnnualSummaryPdf(summary);
    } catch (e: any) {
      notify('Error', e.message ?? 'No se pudo exportar el resumen.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Resumen anual</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.yearNav}>
        <Pressable onPress={() => setYear((y) => y - 1)} hitSlop={12}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.yearLabel}>{year}</Text>
        <Pressable onPress={() => setYear((y) => y + 1)} hitSlop={12}>
          <MaterialCommunityIcons name="chevron-right" size={26} color={colors.text} />
        </Pressable>
      </View>

      {transactionsQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>
            Este resumen es un punto de partida para tu declaración de impuestos, no sustituye la asesoría de tu
            contador.
          </Text>

          <View style={styles.card}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Total ingresos</Text>
              <Text style={[styles.resultValue, { color: colors.ingreso }]}>{formatCurrency(summary.totalIncome)}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Total gastos</Text>
              <Text style={[styles.resultValue, { color: colors.gasto }]}>{formatCurrency(summary.totalExpense)}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Total ahorro</Text>
              <Text style={styles.resultValue}>{formatCurrency(summary.totalSavings)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Neto del año</Text>
              <Text style={[styles.resultValue, { color: summary.net >= 0 ? colors.ingreso : colors.gasto }]}>
                {formatCurrency(summary.net)}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ingresos por categoría</Text>
            {summary.incomeByCategory.length === 0 ? (
              <Text style={styles.hint}>Sin ingresos registrados en {year}.</Text>
            ) : (
              summary.incomeByCategory.map((c) => (
                <View key={c.name} style={styles.resultRow}>
                  <Text style={styles.rowMeta}>{c.name}</Text>
                  <Text style={styles.rowValue}>{formatCurrency(c.total)}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gastos por categoría</Text>
            {summary.expenseByCategory.length === 0 ? (
              <Text style={styles.hint}>Sin gastos registrados en {year}.</Text>
            ) : (
              summary.expenseByCategory.map((c) => (
                <View key={c.name} style={styles.resultRow}>
                  <Text style={styles.rowMeta}>{c.name}</Text>
                  <Text style={styles.rowValue}>{formatCurrency(c.total)}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Desglose mensual</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { textAlign: 'left' }]}>Mes</Text>
              <Text style={styles.tableHeaderText}>Ingresos</Text>
              <Text style={styles.tableHeaderText}>Gastos</Text>
            </View>
            {summary.monthly.map((m) => (
              <View key={m.month} style={styles.tableRow}>
                <Text style={[styles.rowMeta, { flex: 1 }]}>{MONTH_LABELS[m.month]}</Text>
                <Text style={styles.tableCell}>{formatCurrency(m.income)}</Text>
                <Text style={styles.tableCell}>{formatCurrency(m.expense)}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.exportButton} onPress={handleExport} disabled={exporting}>
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="file-pdf-box" size={18} color="#fff" />
                <Text style={styles.exportButtonText}>Exportar resumen (PDF)</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}
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
    yearNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      paddingVertical: 4,
    },
    yearLabel: { fontSize: 17, fontWeight: '700', color: colors.text },
    content: { padding: 16, gap: 16, paddingBottom: 40 },
    subtitle: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
    hint: { fontSize: 13, color: colors.textMuted },
    resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    resultLabel: { fontSize: 13, color: colors.textMuted },
    resultValue: { fontSize: 14, fontWeight: '700', color: colors.text },
    rowMeta: { fontSize: 13, color: colors.text },
    rowValue: { fontSize: 13, fontWeight: '600', color: colors.text },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
    tableHeader: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
    tableHeaderText: { flex: 1, fontSize: 11, fontWeight: '700', color: colors.textMuted, textAlign: 'right' },
    tableRow: { flexDirection: 'row', paddingVertical: 6 },
    tableCell: { flex: 1, fontSize: 12, color: colors.text, textAlign: 'right' },
    exportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
    },
    exportButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  });
