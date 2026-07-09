import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountBalanceRow } from '@/components/AccountBalanceRow';
import { MonthlySummaryCard } from '@/components/MonthlySummaryCard';
import { QuickAddButtons } from '@/components/QuickAddButtons';
import { RecurringDueBanner } from '@/components/RecurringDueBanner';
import { TransactionListItem } from '@/components/TransactionListItem';
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher';
import { ThemeColors } from '@/constants/theme';
import { monthRange } from '@/lib/dateRange';
import { useAccountBalances } from '@/lib/queries/useAccounts';
import { useMonthlySummary } from '@/lib/queries/useMonthlySummary';
import { useRecurringTransactions } from '@/lib/queries/useRecurringTransactions';
import { useTransactions } from '@/lib/queries/useTransactions';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';

export default function DashboardScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const { start, end } = useMemo(() => monthRange(new Date()), []);
  const monthLabel = format(new Date(), 'MMMM yyyy', { locale: es });

  const summaryQuery = useMonthlySummary(currentWorkspace?.id, start, end);
  const transactionsQuery = useTransactions({ workspaceId: currentWorkspace?.id, monthStart: start, monthEnd: end });
  const accountBalances = useAccountBalances(currentWorkspace?.id);
  const recurringQuery = useRecurringTransactions(currentWorkspace?.id);

  const recentTransactions = (transactionsQuery.data ?? []).slice(0, 5);

  if (workspaceLoading || !currentWorkspace) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={summaryQuery.isFetching || transactionsQuery.isFetching}
            onRefresh={() => {
              summaryQuery.refetch();
              transactionsQuery.refetch();
            }}
          />
        }
      >
        <WorkspaceSwitcher />

        {summaryQuery.data ? (
          <MonthlySummaryCard summary={summaryQuery.data} monthLabel={monthLabel} />
        ) : (
          <View style={styles.summaryPlaceholder}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        <AccountBalanceRow
          accounts={accountBalances.data}
          sinCuentaBalance={accountBalances.sinCuentaBalance}
          total={accountBalances.total}
        />

        <RecurringDueBanner recurring={recurringQuery.data ?? []} workspaceId={currentWorkspace?.id} />

        <QuickAddButtons />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimos movimientos</Text>
          {recentTransactions.length === 0 ? (
            <Text style={styles.empty}>Aún no has registrado nada este mes. ¡Agrega tu primer movimiento!</Text>
          ) : (
            recentTransactions.map((t) => <TransactionListItem key={t.id} transaction={t} />)
          )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  summaryPlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: 8,
  },
});
