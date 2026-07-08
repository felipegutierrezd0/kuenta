import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors, typeLabels } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import { useCategories } from '@/lib/queries/useCategories';
import { useAddRecurring, useDeleteRecurring, useRecurringTransactions } from '@/lib/queries/useRecurringTransactions';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';
import { EntryType, RecurringFrequency } from '@/types/database';

const TYPES: EntryType[] = ['ingreso', 'gasto', 'ahorro'];
const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
];

export default function RecurringScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currentWorkspace } = useWorkspace();

  const recurringQuery = useRecurringTransactions(currentWorkspace?.id);
  const addRecurring = useAddRecurring(currentWorkspace?.id);
  const deleteRecurring = useDeleteRecurring(currentWorkspace?.id);

  const [type, setType] = useState<EntryType>('gasto');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<RecurringFrequency>('mensual');
  const categoriesQuery = useCategories(currentWorkspace?.id, type);

  function handleAdd() {
    const parsedAmount = Number(amount.replace(',', '.'));
    if (!(parsedAmount > 0)) return;
    addRecurring.mutate(
      {
        type,
        amount: parsedAmount,
        categoryId,
        note: note.trim() || null,
        frequency,
        nextDueDate: format(new Date(), 'yyyy-MM-dd'),
      },
      { onSuccess: () => { setAmount(''); setNote(''); setCategoryId(null); } }
    );
  }

  function handleDelete(id: string, label: string) {
    Alert.alert('Eliminar recurrente', `¿Eliminar "${label}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteRecurring.mutate(id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Recurrentes</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardHint}>
            Registra pagos o ingresos que se repiten (renta, nómina, suscripciones) para no olvidarlos.
          </Text>
          {(recurringQuery.data ?? []).map((r) => (
            <View key={r.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{r.note ?? r.category?.name ?? typeLabels[r.type]}</Text>
                <Text style={styles.rowMeta}>
                  {formatCurrency(r.amount)} · {FREQUENCIES.find((f) => f.value === r.frequency)?.label} · próximo{' '}
                  {format(new Date(`${r.next_due_date}T00:00:00`), "d 'de' MMM", { locale: es })}
                </Text>
              </View>
              <Pressable onPress={() => handleDelete(r.id, r.note ?? r.category?.name ?? '')} hitSlop={10}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
          {(recurringQuery.data ?? []).length === 0 && (
            <Text style={styles.empty}>Aún no tienes movimientos recurrentes.</Text>
          )}

          <View style={styles.divider} />
          <Text style={styles.subLabel}>Nuevo recurrente</Text>
          <View style={styles.typeRow}>
            {TYPES.map((t) => (
              <Pressable
                key={t}
                style={[styles.typeChip, type === t && { backgroundColor: colors[t], borderColor: colors[t] }]}
                onPress={() => { setType(t); setCategoryId(null); }}
              >
                <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>{typeLabels[t]}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.typeRow}>
            {FREQUENCIES.map((f) => (
              <Pressable
                key={f.value}
                style={[styles.typeChip, frequency === f.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setFrequency(f.value)}
              >
                <Text style={[styles.typeChipText, frequency === f.value && styles.typeChipTextActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.categoryGrid}>
            {(categoriesQuery.data ?? []).map((cat) => (
              <Pressable
                key={cat.id}
                style={[styles.categoryChip, categoryId === cat.id && { backgroundColor: colors[type], borderColor: colors[type] }]}
                onPress={() => setCategoryId(cat.id)}
              >
                <Text style={[styles.categoryChipText, categoryId === cat.id && { color: '#fff' }]}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={[styles.input, { marginBottom: 8 }]}
            placeholder="Descripción (ej. Netflix)"
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
          />
          <View style={styles.inlineForm}>
            <TextInput
              style={styles.input}
              placeholder="Monto"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
            <Pressable
              style={[styles.addButton, !amount && styles.addButtonDisabled]}
              onPress={handleAdd}
              disabled={!amount}
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
    cardHint: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    rowName: { fontSize: 14, fontWeight: '600', color: colors.text },
    rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    empty: { fontSize: 13, color: colors.textMuted, paddingVertical: 8 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
    subLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8 },
    typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
    typeChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeChipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    typeChipTextActive: { color: '#fff' },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    categoryChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    categoryChipText: { fontSize: 13, color: colors.text, fontWeight: '600' },
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
  });
