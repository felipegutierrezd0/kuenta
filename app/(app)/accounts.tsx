import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { confirmDestructive } from '@/lib/alert';
import { formatCurrency } from '@/lib/format';
import { useAccountBalances, useAddAccount, useDeleteAccount, useUpdateAccount } from '@/lib/queries/useAccounts';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';
import { AccountKind } from '@/types/database';

const KINDS: { value: AccountKind; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { value: 'banco', label: 'Banco', icon: 'bank' },
  { value: 'efectivo', label: 'Efectivo', icon: 'cash' },
  { value: 'tarjeta', label: 'Tarjeta', icon: 'credit-card-outline' },
  { value: 'otro', label: 'Otro', icon: 'wallet-outline' },
];

export default function AccountsScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currentWorkspace } = useWorkspace();

  const balancesQuery = useAccountBalances(currentWorkspace?.id);
  const addAccount = useAddAccount(currentWorkspace?.id);
  const updateAccount = useUpdateAccount(currentWorkspace?.id);
  const deleteAccount = useDeleteAccount(currentWorkspace?.id);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<AccountKind>('banco');
  const [initialBalance, setInitialBalance] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftKind, setDraftKind] = useState<AccountKind>('banco');
  const [draftBalance, setDraftBalance] = useState('');

  function handleAdd() {
    if (!name.trim()) return;
    const balance = Number(initialBalance.replace(',', '.')) || 0;
    addAccount.mutate(
      { name: name.trim(), kind, initialBalance: balance },
      { onSuccess: () => { setName(''); setInitialBalance(''); } }
    );
  }

  function startEdit(account: { id: string; name: string; kind: AccountKind; initial_balance: number }) {
    setEditingId(account.id);
    setDraftName(account.name);
    setDraftKind(account.kind);
    setDraftBalance(String(account.initial_balance));
  }

  function handleSaveEdit() {
    if (!editingId || !draftName.trim()) return;
    const balance = Number(draftBalance.replace(',', '.')) || 0;
    updateAccount.mutate(
      { accountId: editingId, name: draftName.trim(), kind: draftKind, initialBalance: balance },
      { onSuccess: () => setEditingId(null) }
    );
  }

  function handleDelete(id: string, accountName: string) {
    confirmDestructive(
      'Eliminar cuenta',
      `¿Eliminar "${accountName}"? Los movimientos ya no estarán asociados a ella.`,
      'Eliminar',
      () => deleteAccount.mutate(id)
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Cuentas</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardHint}>
            Registra tus cuentas de banco, efectivo o tarjetas para ver tu saldo real, no solo lo que
            ingresas y gastas.
          </Text>
          {(balancesQuery.data ?? []).map((account) =>
            editingId === account.id ? (
              <View key={account.id} style={styles.editBlock}>
                <View style={styles.typeRow}>
                  {KINDS.map((k) => (
                    <Pressable
                      key={k.value}
                      style={[styles.typeChip, draftKind === k.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setDraftKind(k.value)}
                    >
                      <Text style={[styles.typeChipText, draftKind === k.value && styles.typeChipTextActive]}>{k.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={[styles.input, { marginBottom: 8 }]}
                  placeholder="Nombre"
                  placeholderTextColor={colors.textMuted}
                  value={draftName}
                  onChangeText={setDraftName}
                />
                <View style={styles.inlineForm}>
                  <TextInput
                    style={styles.input}
                    placeholder="Saldo"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={draftBalance}
                    onChangeText={setDraftBalance}
                  />
                  <Pressable
                    style={styles.iconButton}
                    onPress={handleSaveEdit}
                    disabled={!draftName.trim() || updateAccount.isPending}
                  >
                    <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                  </Pressable>
                  <Pressable style={styles.iconButton} onPress={() => setEditingId(null)}>
                    <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View key={account.id} style={styles.row}>
                <View style={styles.rowIcon}>
                  <MaterialCommunityIcons
                    name={KINDS.find((k) => k.value === account.kind)?.icon ?? 'wallet-outline'}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{account.name}</Text>
                  <Text style={styles.rowMeta}>{KINDS.find((k) => k.value === account.kind)?.label}</Text>
                </View>
                <Text style={[styles.balance, { color: account.balance >= 0 ? colors.ingreso : colors.gasto }]}>
                  {formatCurrency(account.balance)}
                </Text>
                <Pressable onPress={() => startEdit(account)} hitSlop={10} style={{ marginLeft: 10 }}>
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textMuted} />
                </Pressable>
                <Pressable onPress={() => handleDelete(account.id, account.name)} hitSlop={10} style={{ marginLeft: 10 }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            )
          )}
          {(balancesQuery.data ?? []).length === 0 && (
            <Text style={styles.empty}>Aún no tienes cuentas registradas.</Text>
          )}

          <View style={styles.divider} />
          <Text style={styles.subLabel}>Agregar cuenta</Text>
          <View style={styles.typeRow}>
            {KINDS.map((k) => (
              <Pressable
                key={k.value}
                style={[styles.typeChip, kind === k.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setKind(k.value)}
              >
                <Text style={[styles.typeChipText, kind === k.value && styles.typeChipTextActive]}>{k.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[styles.input, { marginBottom: 8 }]}
            placeholder="Nombre (ej. Cuenta de ahorros)"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <View style={styles.inlineForm}>
            <TextInput
              style={styles.input}
              placeholder="Saldo inicial (opcional)"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={initialBalance}
              onChangeText={setInitialBalance}
            />
            <Pressable
              style={[styles.addButton, !name.trim() && styles.addButtonDisabled]}
              onPress={handleAdd}
              disabled={!name.trim()}
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
    editBlock: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 4,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.ahorroBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    rowName: { fontSize: 14, fontWeight: '600', color: colors.text },
    rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    balance: { fontSize: 14, fontWeight: '700' },
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
