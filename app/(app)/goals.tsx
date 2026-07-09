import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalCard } from '@/components/GoalCard';
import { ThemeColors } from '@/constants/theme';
import { confirmDestructive } from '@/lib/alert';
import {
  useAddSavingsGoal,
  useContributeToGoal,
  useDeleteSavingsGoal,
  useSavingsGoals,
} from '@/lib/queries/useSavingsGoals';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';

export default function GoalsScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currentWorkspace } = useWorkspace();

  const goalsQuery = useSavingsGoals(currentWorkspace?.id);
  const addGoal = useAddSavingsGoal(currentWorkspace?.id);
  const contribute = useContributeToGoal(currentWorkspace?.id);
  const deleteGoal = useDeleteSavingsGoal(currentWorkspace?.id);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [monthsAhead, setMonthsAhead] = useState('');

  function handleAdd() {
    const amount = Number(targetAmount.replace(',', '.'));
    if (!name.trim() || !(amount > 0)) return;
    const months = Number(monthsAhead) || 0;
    const targetDate = months > 0 ? format(new Date(new Date().setMonth(new Date().getMonth() + months)), 'yyyy-MM-dd') : null;
    addGoal.mutate(
      { name: name.trim(), targetAmount: amount, targetDate },
      { onSuccess: () => { setName(''); setTargetAmount(''); setMonthsAhead(''); } }
    );
  }

  function handleDelete(id: string, goalName: string) {
    confirmDestructive('Eliminar meta', `¿Eliminar "${goalName}"?`, 'Eliminar', () => deleteGoal.mutate(id));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Metas de ahorro</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {(goalsQuery.data ?? []).map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onContribute={(amount) => contribute.mutate({ goalId: goal.id, amount, savedAmount: goal.saved_amount })}
            onDelete={() => handleDelete(goal.id, goal.name)}
          />
        ))}
        {(goalsQuery.data ?? []).length === 0 && (
          <Text style={styles.empty}>Aún no tienes metas. Crea una abajo, por ejemplo un fondo de emergencia.</Text>
        )}

        <View style={styles.card}>
          <Text style={styles.subLabel}>Nueva meta</Text>
          <TextInput
            style={[styles.input, { marginBottom: 8 }]}
            placeholder="Nombre (ej. Fondo de emergencia)"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <View style={styles.inlineForm}>
            <TextInput
              style={styles.input}
              placeholder="Monto objetivo"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={targetAmount}
              onChangeText={setTargetAmount}
            />
            <TextInput
              style={[styles.input, { flex: 0.6 }]}
              placeholder="Meses"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={monthsAhead}
              onChangeText={setMonthsAhead}
            />
            <Pressable
              style={[styles.addButton, (!name.trim() || !targetAmount) && styles.addButtonDisabled]}
              onPress={handleAdd}
              disabled={!name.trim() || !targetAmount}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            </Pressable>
          </View>
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
    subLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8 },
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
    addButtonDisabled: { opacity: 0.5 },
    empty: { fontSize: 13, color: colors.textMuted },
  });
