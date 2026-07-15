import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import { useAccounts } from '@/lib/queries/useAccounts';
import { useCategories } from '@/lib/queries/useCategories';
import { useColors } from '@/lib/ThemeProvider';
import { useWidgetPresets } from '@/lib/widgetPresets';
import { useWorkspace } from '@/lib/WorkspaceProvider';

type QuickAddType = 'gasto' | 'ingreso';

export default function WidgetSettingsScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currentWorkspace } = useWorkspace();

  const [type, setType] = useState<QuickAddType>('gasto');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  const categoriesQuery = useCategories(currentWorkspace?.id, type);
  const accountsQuery = useAccounts(currentWorkspace?.id);
  const { presets, addPreset, removePreset, maxPresets } = useWidgetPresets(currentWorkspace?.id);

  const parsedAmount = Number(amount.replace(',', '.'));
  const canAdd = label.trim().length > 0 && parsedAmount > 0 && presets.length < maxPresets;

  function selectType(next: QuickAddType) {
    setType(next);
    setCategoryId(null);
  }

  function handleAdd() {
    if (!canAdd) return;
    const category = (categoriesQuery.data ?? []).find((c) => c.id === categoryId) ?? null;
    const account = (accountsQuery.data ?? []).find((a) => a.id === accountId) ?? null;
    addPreset({
      label: label.trim(),
      type,
      categoryId,
      categoryName: category?.name ?? null,
      accountId,
      accountName: account?.name ?? null,
      amount: parsedAmount,
    });
    setLabel('');
    setAmount('');
    setCategoryId(null);
    setAccountId(null);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Widget de iPhone</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Agrega el widget de Kuenta a tu pantalla de inicio y configura hasta {maxPresets} accesos rápidos: al
          tocarlos desde el widget se registra el movimiento al instante, sin abrir la app. Usa el botón "+" del
          widget para montos personalizados.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tus accesos rápidos ({presets.length}/{maxPresets})</Text>
          {presets.length === 0 ? (
            <Text style={styles.hint}>Aún no tienes accesos rápidos configurados.</Text>
          ) : (
            presets.map((p) => (
              <View key={p.id} style={styles.presetRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.presetLabel}>{p.label}</Text>
                  <Text style={styles.hint}>
                    {p.type === 'gasto' ? '-' : '+'}
                    {formatCurrency(p.amount)}
                    {p.categoryName ? ` · ${p.categoryName}` : ''}
                    {p.accountName ? ` · ${p.accountName}` : ''}
                  </Text>
                </View>
                <Pressable onPress={() => removePreset(p.id)} hitSlop={10}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        {presets.length < maxPresets && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nuevo acceso rápido</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre (ej. Café)"
              placeholderTextColor={colors.textMuted}
              value={label}
              onChangeText={setLabel}
            />
            <View style={styles.typeRow}>
              {(['gasto', 'ingreso'] as QuickAddType[]).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, type === t && { backgroundColor: colors[t], borderColor: colors[t] }]}
                  onPress={() => selectType(t)}
                >
                  <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                    {t === 'gasto' ? 'Gasto' : 'Ingreso'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.subLabel}>Categoría (opcional)</Text>
            <View style={styles.chipRow}>
              {(categoriesQuery.data ?? []).map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.chip, categoryId === c.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
                >
                  <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.subLabel}>Cuenta (opcional)</Text>
            <View style={styles.chipRow}>
              {(accountsQuery.data ?? []).map((a) => (
                <Pressable
                  key={a.id}
                  style={[styles.chip, accountId === a.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setAccountId(accountId === a.id ? null : a.id)}
                >
                  <Text style={[styles.chipText, accountId === a.id && styles.chipTextActive]}>{a.name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.subLabel}>Monto</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />

            <Pressable style={[styles.addButton, !canAdd && styles.addButtonDisabled]} onPress={handleAdd} disabled={!canAdd}>
              <Text style={styles.addButtonText}>Agregar acceso rápido</Text>
            </Pressable>
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
    hint: { fontSize: 12, color: colors.textMuted },
    presetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    presetLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
    subLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: 4 },
    typeRow: { flexDirection: 'row', gap: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },
    chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    chipTextActive: { color: '#fff' },
    input: {
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
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    addButtonDisabled: { opacity: 0.5 },
    addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  });
