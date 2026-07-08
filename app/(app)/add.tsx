import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors, typeLabels } from '@/constants/theme';
import { useAccounts } from '@/lib/queries/useAccounts';
import { useCategories } from '@/lib/queries/useCategories';
import { useAddTransaction } from '@/lib/queries/useTransactions';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';
import { EntryType } from '@/types/database';

const TYPES: EntryType[] = ['ingreso', 'gasto', 'ahorro'];

export default function AddTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const initialType = TYPES.includes(params.type as EntryType) ? (params.type as EntryType) : 'gasto';

  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currentWorkspace } = useWorkspace();
  const [type, setType] = useState<EntryType>(initialType);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const categoriesQuery = useCategories(currentWorkspace?.id, type);
  const accountsQuery = useAccounts(currentWorkspace?.id);
  const addTransaction = useAddTransaction();

  const activeColor = colors[type];
  const parsedAmount = Number(amount.replace(',', '.'));
  const canSave = currentWorkspace && parsedAmount > 0 && !addTransaction.isPending;

  function selectType(next: EntryType) {
    setType(next);
    setCategoryId(null);
  }

  async function handleSave() {
    if (!currentWorkspace || !canSave) return;
    await addTransaction.mutateAsync({
      workspaceId: currentWorkspace.id,
      type,
      amount: parsedAmount,
      categoryId,
      accountId,
      note: note.trim() || null,
      occurredOn: format(new Date(), 'yyyy-MM-dd'),
    });
    router.back();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Nuevo movimiento</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.typeRow}>
            {TYPES.map((t) => (
              <Pressable
                key={t}
                style={[styles.typeButton, type === t && { backgroundColor: colors[t] }]}
                onPress={() => selectType(t)}
              >
                <Text style={[styles.typeButtonText, type === t && styles.typeButtonTextActive]}>
                  {typeLabels[t]}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.amountWrap}>
            <Text style={[styles.currencySign, { color: activeColor }]}>$</Text>
            <TextInput
              style={[styles.amountInput, { color: activeColor }]}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>

          <Text style={styles.label}>Categoría</Text>
          <View style={styles.categoryGrid}>
            {(categoriesQuery.data ?? []).map((cat) => (
              <Pressable
                key={cat.id}
                style={[
                  styles.categoryChip,
                  categoryId === cat.id && { backgroundColor: activeColor, borderColor: activeColor },
                ]}
                onPress={() => setCategoryId(cat.id)}
              >
                <MaterialCommunityIcons
                  name={(cat.icon as keyof typeof MaterialCommunityIcons.glyphMap) ?? 'circle-outline'}
                  size={16}
                  color={categoryId === cat.id ? '#fff' : colors.textMuted}
                />
                <Text style={[styles.categoryChipText, categoryId === cat.id && { color: '#fff' }]}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>

          {(accountsQuery.data ?? []).length > 0 && (
            <>
              <Text style={styles.label}>Cuenta (opcional)</Text>
              <View style={styles.categoryGrid}>
                <Pressable
                  style={[styles.categoryChip, accountId === null && { backgroundColor: activeColor, borderColor: activeColor }]}
                  onPress={() => setAccountId(null)}
                >
                  <Text style={[styles.categoryChipText, accountId === null && { color: '#fff' }]}>Sin cuenta</Text>
                </Pressable>
                {(accountsQuery.data ?? []).map((acc) => (
                  <Pressable
                    key={acc.id}
                    style={[styles.categoryChip, accountId === acc.id && { backgroundColor: activeColor, borderColor: activeColor }]}
                    onPress={() => setAccountId(acc.id)}
                  >
                    <Text style={[styles.categoryChipText, accountId === acc.id && { color: '#fff' }]}>{acc.name}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>Nota (opcional)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Ej. Supermercado, pago cliente..."
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
          />

          {addTransaction.isError && <Text style={styles.error}>No se pudo guardar. Intenta de nuevo.</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.saveButton, { backgroundColor: activeColor }, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            {addTransaction.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeButtonText: {
    fontWeight: '600',
    color: colors.textMuted,
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  currencySign: {
    fontSize: 32,
    fontWeight: '700',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    minWidth: 140,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 12,
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  categoryChipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  noteInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  error: {
    color: colors.gasto,
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
