import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { notify } from '@/lib/alert';
import { exportTransactionsCsv } from '@/lib/export';
import { useAllTransactions } from '@/lib/queries/useTransactions';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';

function NavRow({
  icon,
  label,
  onPress,
  colors,
  styles,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  colors: ThemeColors;
  styles: ReturnType<typeof getStyles>;
}) {
  return (
    <Pressable style={styles.navRow} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      <Text style={styles.navRowLabel}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

export default function ToolsScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currentWorkspace } = useWorkspace();
  const allTransactionsQuery = useAllTransactions(currentWorkspace?.id);
  const [exporting, setExporting] = useState(false);

  const isNegocio = currentWorkspace?.type === 'negocio';

  async function handleExport() {
    setExporting(true);
    try {
      await exportTransactionsCsv(allTransactionsQuery.data ?? []);
    } catch (e: any) {
      notify('Error', e.message ?? 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Herramientas</Text>

        <View style={styles.card}>
          <NavRow icon="bank-outline" label="Cuentas" onPress={() => router.push('/(app)/accounts')} colors={colors} styles={styles} />
          <NavRow icon="wallet-outline" label="Presupuestos" onPress={() => router.push('/(app)/budgets')} colors={colors} styles={styles} />
          <NavRow icon="flag-outline" label="Metas de ahorro" onPress={() => router.push('/(app)/goals')} colors={colors} styles={styles} />
          <NavRow icon="calendar-sync-outline" label="Recurrentes" onPress={() => router.push('/(app)/recurring')} colors={colors} styles={styles} />
          {isNegocio && (
            <NavRow icon="handshake-outline" label="Cobros y pagos" onPress={() => router.push('/(app)/receivables')} colors={colors} styles={styles} />
          )}
          {isNegocio && (
            <NavRow icon="account-multiple-outline" label="Miembros" onPress={() => router.push('/(app)/members')} colors={colors} styles={styles} />
          )}

          <Pressable style={styles.navRow} onPress={handleExport} disabled={exporting}>
            <MaterialCommunityIcons name="file-export-outline" size={20} color={colors.primary} />
            <Text style={styles.navRowLabel}>Exportar movimientos (CSV)</Text>
            {exporting ? <ActivityIndicator size="small" color={colors.primary} /> : <View style={{ width: 20 }} />}
          </Pressable>
          <NavRow icon="backup-restore" label="Respaldo (exportar / importar)" onPress={() => router.push('/(app)/backup')} colors={colors} styles={styles} />
          <NavRow icon="chart-timeline-variant" label="Simulador '¿qué pasaría si?'" onPress={() => router.push('/(app)/whatif')} colors={colors} styles={styles} />
          <NavRow icon="account-multiple-outline" label="Gastos compartidos" onPress={() => router.push('/(app)/splits')} colors={colors} styles={styles} />
          <NavRow icon="file-chart-outline" label="Resumen anual para impuestos" onPress={() => router.push('/(app)/tax-summary')} colors={colors} styles={styles} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
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
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  navRowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
