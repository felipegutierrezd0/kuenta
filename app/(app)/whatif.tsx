import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import { useCategories } from '@/lib/queries/useCategories';
import { useSavingsGoals } from '@/lib/queries/useSavingsGoals';
import { useAllTransactions } from '@/lib/queries/useTransactions';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';
import { CategoryReduction, computeWhatIf, projectGoalCompletion } from '@/lib/whatif';

export default function WhatIfScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currentWorkspace } = useWorkspace();

  const transactionsQuery = useAllTransactions(currentWorkspace?.id);
  const categoriesQuery = useCategories(currentWorkspace?.id, 'gasto');
  const goalsQuery = useSavingsGoals(currentWorkspace?.id);

  const [reductions, setReductions] = useState<CategoryReduction[]>([]);
  const [pickingCategoryId, setPickingCategoryId] = useState<string | null>(null);
  const [pct, setPct] = useState('20');
  const [extraExpense, setExtraExpense] = useState('');
  const [extraIncome, setExtraIncome] = useState('');

  const transactions = transactionsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const availableCategories = categories.filter((c) => !reductions.some((r) => r.categoryId === c.id));

  const result = useMemo(
    () =>
      computeWhatIf(transactions, {
        reductions,
        extraMonthlyExpense: Number(extraExpense.replace(',', '.')) || 0,
        extraMonthlyIncome: Number(extraIncome.replace(',', '.')) || 0,
      }),
    [transactions, reductions, extraExpense, extraIncome]
  );

  const goalProjections = (goalsQuery.data ?? [])
    .filter((g) => g.saved_amount < g.target_amount)
    .map((g) => projectGoalCompletion(g, result.baselineMonthlyNet, result.projectedMonthlyNet));

  function addReduction() {
    if (!pickingCategoryId) return;
    const category = categories.find((c) => c.id === pickingCategoryId);
    if (!category) return;
    const parsedPct = Math.min(100, Math.max(0, Number(pct) || 0));
    setReductions((prev) => [...prev, { categoryId: category.id, categoryName: category.name, pct: parsedPct }]);
    setPickingCategoryId(null);
    setPct('20');
  }

  function removeReduction(categoryId: string) {
    setReductions((prev) => prev.filter((r) => r.categoryId !== categoryId));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>¿Qué pasaría si...?</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Simula cambios en tus finanzas y mira el impacto estimado en tu balance mensual y anual, usando el promedio
          de tus meses anteriores como línea base.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reducir un gasto</Text>
          {reductions.length > 0 && (
            <View style={{ gap: 8, marginBottom: 4 }}>
              {reductions.map((r) => (
                <View key={r.categoryId} style={styles.reductionRow}>
                  <Text style={styles.reductionText}>
                    {r.categoryName}: -{r.pct}%
                  </Text>
                  <Pressable onPress={() => removeReduction(r.categoryId)} hitSlop={8}>
                    <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          {availableCategories.length === 0 ? (
            <Text style={styles.hint}>Ya agregaste todas tus categorías de gasto al escenario.</Text>
          ) : (
            <>
              <View style={styles.chipRow}>
                {availableCategories.map((c) => (
                  <Pressable
                    key={c.id}
                    style={[styles.chip, pickingCategoryId === c.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setPickingCategoryId(c.id)}
                  >
                    <Text style={[styles.chipText, pickingCategoryId === c.id && { color: '#fff' }]}>{c.name}</Text>
                  </Pressable>
                ))}
              </View>
              {pickingCategoryId && (
                <View style={styles.inlineForm}>
                  <TextInput
                    style={styles.input}
                    placeholder="% a reducir"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={pct}
                    onChangeText={setPct}
                  />
                  <Pressable style={styles.addButton} onPress={addReduction}>
                    <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Otros ajustes</Text>
          <Text style={styles.subLabel}>Gasto mensual nuevo (ej. una nueva suscripción)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={extraExpense}
            onChangeText={setExtraExpense}
          />
          <Text style={[styles.subLabel, { marginTop: 10 }]}>Ingreso mensual nuevo (ej. un cliente extra)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={extraIncome}
            onChangeText={setExtraIncome}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resultado</Text>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Balance mensual actual</Text>
            <Text style={styles.resultValue}>{formatCurrency(result.baselineMonthlyNet)}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Balance mensual proyectado</Text>
            <Text style={[styles.resultValue, { color: result.projectedMonthlyNet >= 0 ? colors.ingreso : colors.gasto }]}>
              {formatCurrency(result.projectedMonthlyNet)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Diferencia mensual</Text>
            <Text style={[styles.resultValue, { color: result.monthlyDelta >= 0 ? colors.ingreso : colors.gasto }]}>
              {result.monthlyDelta >= 0 ? '+' : ''}
              {formatCurrency(result.monthlyDelta)}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Diferencia en 12 meses</Text>
            <Text style={[styles.resultValue, { color: result.annualDelta >= 0 ? colors.ingreso : colors.gasto }]}>
              {result.annualDelta >= 0 ? '+' : ''}
              {formatCurrency(result.annualDelta)}
            </Text>
          </View>
        </View>

        {goalProjections.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Impacto en tus metas de ahorro</Text>
            {goalProjections.map(({ goal, monthsBefore, monthsAfter }) => (
              <View key={goal.id} style={{ marginBottom: 10 }}>
                <Text style={styles.reductionText}>{goal.name}</Text>
                <Text style={styles.hint}>
                  Antes: {monthsBefore ? `~${Math.ceil(monthsBefore)} meses` : 'sin excedente para ahorrar'} · Con este
                  escenario: {monthsAfter ? `~${Math.ceil(monthsAfter)} meses` : 'sin excedente para ahorrar'}
                </Text>
              </View>
            ))}
          </View>
        )}
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
    subtitle: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    subLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
    hint: { fontSize: 12, color: colors.textMuted },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },
    chipText: { fontSize: 12, fontWeight: '600', color: colors.text },
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
    addButton: {
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reductionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    reductionText: { fontSize: 13, fontWeight: '600', color: colors.text },
    resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    resultLabel: { fontSize: 13, color: colors.textMuted },
    resultValue: { fontSize: 14, fontWeight: '700', color: colors.text },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  });
