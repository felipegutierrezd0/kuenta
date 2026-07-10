import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import { useCategories } from '@/lib/queries/useCategories';
import { useAllTransactions, useUpdateTransactionCategory } from '@/lib/queries/useTransactions';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';
import { Transaction } from '@/types/database';

export default function UncategorizedScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currentWorkspace } = useWorkspace();

  const transactionsQuery = useAllTransactions(currentWorkspace?.id);
  const categoriesQuery = useCategories(currentWorkspace?.id);
  const updateCategory = useUpdateTransactionCategory(currentWorkspace?.id);

  const uncategorized = (transactionsQuery.data ?? []).filter((t) => !t.category_id);
  const categories = categoriesQuery.data ?? [];

  function renderItem(t: Transaction) {
    const options = categories.filter((c) => c.type === t.type);
    return (
      <View key={t.id} style={styles.item}>
        <View style={styles.itemHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.note}>{t.note || 'Sin nota'}</Text>
            <Text style={styles.meta}>{format(parseISO(t.occurred_on), "d 'de' MMM", { locale: es })}</Text>
          </View>
          <Text style={[styles.amount, { color: colors[t.type] }]}>{formatCurrency(t.amount)}</Text>
        </View>
        <View style={styles.chipRow}>
          {options.length === 0 ? (
            <Text style={styles.hint}>No hay categorías de este tipo todavía.</Text>
          ) : (
            options.map((c) => (
              <Pressable
                key={c.id}
                style={styles.chip}
                onPress={() => updateCategory.mutate({ transactionId: t.id, categoryId: c.id })}
                disabled={updateCategory.isPending}
              >
                <MaterialCommunityIcons
                  name={(c.icon as keyof typeof MaterialCommunityIcons.glyphMap) ?? 'circle-outline'}
                  size={14}
                  color={colors.textMuted}
                />
                <Text style={styles.chipText}>{c.name}</Text>
              </Pressable>
            ))
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Categorizar movimientos</Text>
        <View style={{ width: 24 }} />
      </View>

      {transactionsQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {uncategorized.length === 0 ? (
            <View style={styles.card}>
              <MaterialCommunityIcons name="check-circle-outline" size={22} color={colors.ingreso} />
              <Text style={styles.emptyText}>Todos tus movimientos ya tienen categoría. ¡Buen trabajo!</Text>
            </View>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Toca una categoría para asignarla a cada movimiento. Se actualizarán tus reportes y consejos al instante.
              </Text>
              {uncategorized.map(renderItem)}
            </>
          )}
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
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    subtitle: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 4 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      gap: 8,
    },
    emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
    item: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    itemHeader: { flexDirection: 'row', alignItems: 'center' },
    note: { fontSize: 14, fontWeight: '600', color: colors.text },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
    amount: { fontSize: 14, fontWeight: '700' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    chipText: { fontSize: 12, color: colors.text, fontWeight: '600' },
    hint: { fontSize: 12, color: colors.textMuted },
  });
