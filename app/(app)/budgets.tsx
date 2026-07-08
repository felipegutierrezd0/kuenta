import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BudgetProgressBar } from '@/components/BudgetProgressBar';
import { ThemeColors } from '@/constants/theme';
import { monthRange } from '@/lib/dateRange';
import { useCategories } from '@/lib/queries/useCategories';
import { useBudgets, useDeleteBudget, useUpsertBudget } from '@/lib/queries/useBudgets';
import { useCategoryBreakdown } from '@/lib/queries/useReports';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';

export default function BudgetsScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currentWorkspace } = useWorkspace();
  const { start, end } = useMemo(() => monthRange(new Date()), []);

  const categoriesQuery = useCategories(currentWorkspace?.id, 'gasto');
  const budgetsQuery = useBudgets(currentWorkspace?.id);
  const breakdownQuery = useCategoryBreakdown(currentWorkspace?.id, start, end, 'gasto');
  const upsertBudget = useUpsertBudget(currentWorkspace?.id);
  const deleteBudget = useDeleteBudget(currentWorkspace?.id);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLimit, setDraftLimit] = useState('');

  const categories = categoriesQuery.data ?? [];
  const budgets = budgetsQuery.data ?? [];
  const spentByCategory = new Map((breakdownQuery.data ?? []).map((item) => [item.categoryId, item.total]));

  function startEdit(categoryId: string, currentLimit?: number) {
    setEditingId(categoryId);
    setDraftLimit(currentLimit ? String(currentLimit) : '');
  }

  function saveLimit(categoryId: string) {
    const value = Number(draftLimit.replace(',', '.'));
    if (!(value > 0)) return;
    upsertBudget.mutate({ categoryId, monthlyLimit: value }, { onSuccess: () => setEditingId(null) });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Presupuestos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardHint}>
            Define un límite mensual por categoría de gasto. Te avisaremos en Consejos si vas a superarlo.
          </Text>

          {categories.map((category) => {
            const budget = budgets.find((b) => b.category_id === category.id);
            const spent = spentByCategory.get(category.id) ?? 0;
            const isEditing = editingId === category.id;

            return (
              <View key={category.id} style={styles.categoryBlock}>
                {budget && !isEditing ? (
                  <>
                    <BudgetProgressBar label={category.name} spent={spent} limit={budget.monthly_limit} />
                    <View style={styles.actionsRow}>
                      <Pressable onPress={() => startEdit(category.id, budget.monthly_limit)} hitSlop={8}>
                        <Text style={styles.linkText}>Editar</Text>
                      </Pressable>
                      <Pressable onPress={() => deleteBudget.mutate(budget.id)} hitSlop={8}>
                        <Text style={[styles.linkText, { color: colors.gasto }]}>Quitar</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <View>
                    <Text style={styles.label}>{category.name}</Text>
                    <View style={styles.inlineForm}>
                      <TextInput
                        style={styles.input}
                        placeholder="Límite mensual"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        value={isEditing ? draftLimit : ''}
                        onChangeText={setDraftLimit}
                        onFocus={() => startEdit(category.id, budget?.monthly_limit)}
                      />
                      <Pressable
                        style={[styles.saveButton, !draftLimit && styles.saveButtonDisabled]}
                        onPress={() => saveLimit(category.id)}
                        disabled={!draftLimit || editingId !== category.id}
                      >
                        <MaterialCommunityIcons name="check" size={18} color="#fff" />
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {categories.length === 0 && (
            <Text style={styles.empty}>Aún no tienes categorías de gasto. Agrégalas en Ajustes.</Text>
          )}
        </View>
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
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHint: { fontSize: 12, color: colors.textMuted, marginBottom: 16 },
    categoryBlock: {
      marginBottom: 14,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    actionsRow: { flexDirection: 'row', gap: 16, marginTop: -6 },
    linkText: { fontSize: 12, fontWeight: '600', color: colors.primary },
    label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 },
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
    saveButton: {
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButtonDisabled: { opacity: 0.5 },
    empty: { fontSize: 13, color: colors.textMuted },
  });
