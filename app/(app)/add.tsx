import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { notify } from '@/lib/alert';
import { useAccounts } from '@/lib/queries/useAccounts';
import { useCategories } from '@/lib/queries/useCategories';
import { useAddExpenseSplits } from '@/lib/queries/useExpenseSplits';
import { useAddTransaction } from '@/lib/queries/useTransactions';
import { pickReceiptImage, uploadReceiptImage } from '@/lib/receipts';
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
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [attachingReceipt, setAttachingReceipt] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [participants, setParticipants] = useState<{ name: string; amount: string }[]>([]);

  const categoriesQuery = useCategories(currentWorkspace?.id, type);
  const accountsQuery = useAccounts(currentWorkspace?.id);
  const addTransaction = useAddTransaction();
  const addExpenseSplits = useAddExpenseSplits(currentWorkspace?.id);

  const activeColor = colors[type];
  const parsedAmount = Number(amount.replace(',', '.'));
  const totalShares = participants.reduce((sum, p) => sum + (Number(p.amount.replace(',', '.')) || 0), 0);
  const yourShare = parsedAmount - totalShares;
  const sharesValid = !sharing || totalShares <= parsedAmount;
  const canSave = currentWorkspace && parsedAmount > 0 && !addTransaction.isPending && !attachingReceipt && sharesValid;

  function selectType(next: EntryType) {
    setType(next);
    setCategoryId(null);
    if (next !== 'gasto') {
      setSharing(false);
      setParticipants([]);
    }
  }

  async function handleAttachReceipt() {
    const uri = await pickReceiptImage();
    if (uri) setReceiptUri(uri);
  }

  function addParticipant() {
    setParticipants((prev) => [...prev, { name: '', amount: '' }]);
  }

  function updateParticipant(index: number, field: 'name' | 'amount', value: string) {
    setParticipants((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function removeParticipant(index: number) {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!currentWorkspace || !canSave) return;
    let receiptUrl: string | null = null;
    if (receiptUri) {
      setAttachingReceipt(true);
      try {
        receiptUrl = await uploadReceiptImage(currentWorkspace.id, receiptUri);
      } catch (e: any) {
        setAttachingReceipt(false);
        notify('Error', e.message ?? 'No se pudo subir la foto del recibo');
        return;
      }
      setAttachingReceipt(false);
    }
    const created = await addTransaction.mutateAsync({
      workspaceId: currentWorkspace.id,
      type,
      amount: parsedAmount,
      categoryId,
      accountId,
      note: note.trim() || null,
      occurredOn: format(new Date(), 'yyyy-MM-dd'),
      receiptUrl,
    });

    const validSplits = participants
      .filter((p) => p.name.trim() && Number(p.amount.replace(',', '.')) > 0)
      .map((p) => ({ participantName: p.name.trim(), shareAmount: Number(p.amount.replace(',', '.')) }));
    if (sharing && validSplits.length > 0) {
      await addExpenseSplits.mutateAsync({ transactionId: created.id, splits: validSplits });
    }

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

          <Text style={styles.label}>Recibo (opcional)</Text>
          {receiptUri ? (
            <View style={styles.receiptRow}>
              <Image source={{ uri: receiptUri }} style={styles.receiptThumb} />
              <Pressable style={styles.receiptRemove} onPress={() => setReceiptUri(null)}>
                <MaterialCommunityIcons name="close-circle" size={22} color={colors.gasto} />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.receiptButton} onPress={handleAttachReceipt}>
              <MaterialCommunityIcons name="camera-outline" size={18} color={colors.primary} />
              <Text style={styles.receiptButtonText}>Adjuntar foto del recibo</Text>
            </Pressable>
          )}

          {type === 'gasto' && (
            <>
              <Pressable
                style={[styles.shareToggle, sharing && { backgroundColor: activeColor, borderColor: activeColor }]}
                onPress={() => setSharing((s) => !s)}
              >
                <MaterialCommunityIcons
                  name="account-multiple-outline"
                  size={18}
                  color={sharing ? '#fff' : colors.primary}
                />
                <Text style={[styles.shareToggleText, sharing && { color: '#fff' }]}>Compartir con otras personas</Text>
              </Pressable>

              {sharing && (
                <View style={{ gap: 8 }}>
                  {participants.map((p, index) => (
                    <View key={index} style={styles.participantRow}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Nombre"
                        placeholderTextColor={colors.textMuted}
                        value={p.name}
                        onChangeText={(v) => updateParticipant(index, 'name', v)}
                      />
                      <TextInput
                        style={[styles.input, { flex: 0.6 }]}
                        placeholder="Monto"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        value={p.amount}
                        onChangeText={(v) => updateParticipant(index, 'amount', v)}
                      />
                      <Pressable onPress={() => removeParticipant(index)} hitSlop={8}>
                        <MaterialCommunityIcons name="close-circle" size={20} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable style={styles.addParticipantButton} onPress={addParticipant}>
                    <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                    <Text style={styles.addParticipantText}>Agregar persona</Text>
                  </Pressable>
                  {parsedAmount > 0 && (
                    <Text style={!sharesValid ? styles.error : styles.hint}>
                      {sharesValid
                        ? `Tu parte: ${yourShare.toFixed(2)}`
                        : 'La suma de las partes no puede superar el monto total.'}
                    </Text>
                  )}
                </View>
              )}
            </>
          )}

          {addTransaction.isError && <Text style={styles.error}>No se pudo guardar. Intenta de nuevo.</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.saveButton, { backgroundColor: activeColor }, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            {addTransaction.isPending || attachingReceipt ? (
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
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
  },
  receiptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.card,
  },
  receiptRemove: {
    marginLeft: 10,
  },
  shareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  shareToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  addParticipantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  addParticipantText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
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
