import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import {
  useAddReceivable,
  useDeleteReceivable,
  useReceivables,
  useUpdateReceivableStatus,
} from '@/lib/queries/useReceivables';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';
import { Receivable, ReceivableDirection } from '@/types/database';

export default function ReceivablesScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currentWorkspace } = useWorkspace();

  const receivablesQuery = useReceivables(currentWorkspace?.id);
  const addReceivable = useAddReceivable(currentWorkspace?.id);
  const updateStatus = useUpdateReceivableStatus(currentWorkspace?.id);
  const deleteReceivable = useDeleteReceivable(currentWorkspace?.id);

  const [direction, setDirection] = useState<ReceivableDirection>('cobrar');
  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState('');
  const [daysAhead, setDaysAhead] = useState('');

  const isNegocio = currentWorkspace?.type === 'negocio';
  const items = receivablesQuery.data ?? [];
  const cobrar = items.filter((r) => r.direction === 'cobrar');
  const pagar = items.filter((r) => r.direction === 'pagar');

  function handleAdd() {
    const parsedAmount = Number(amount.replace(',', '.'));
    if (!counterparty.trim() || !(parsedAmount > 0)) return;
    const days = Number(daysAhead) || 0;
    const dueDate = days > 0 ? format(new Date(new Date().setDate(new Date().getDate() + days)), 'yyyy-MM-dd') : null;
    addReceivable.mutate(
      { direction, counterparty: counterparty.trim(), amount: parsedAmount, dueDate },
      { onSuccess: () => { setCounterparty(''); setAmount(''); setDaysAhead(''); } }
    );
  }

  function handleDelete(id: string, name: string) {
    Alert.alert('Eliminar', `¿Eliminar "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteReceivable.mutate(id) },
    ]);
  }

  function renderItem(item: Receivable) {
    const isPaid = item.status === 'pagado';
    return (
      <View key={item.id} style={styles.row}>
        <Pressable
          style={styles.checkbox}
          onPress={() => updateStatus.mutate({ receivableId: item.id, status: isPaid ? 'pendiente' : 'pagado' })}
        >
          <MaterialCommunityIcons
            name={isPaid ? 'check-circle' : 'checkbox-blank-circle-outline'}
            size={22}
            color={isPaid ? colors.ingreso : colors.textMuted}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowName, isPaid && styles.rowNameDone]}>{item.counterparty}</Text>
          {item.due_date && (
            <Text style={styles.rowMeta}>Vence {format(new Date(`${item.due_date}T00:00:00`), "d 'de' MMM", { locale: es })}</Text>
          )}
        </View>
        <Text style={[styles.amount, { color: item.direction === 'cobrar' ? colors.ingreso : colors.gasto }]}>
          {formatCurrency(item.amount)}
        </Text>
        <Pressable onPress={() => handleDelete(item.id, item.counterparty)} hitSlop={10} style={{ marginLeft: 8 }}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Cobros y pagos</Text>
        <View style={{ width: 24 }} />
      </View>

      {!isNegocio ? (
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardHint}>
              Esta herramienta está pensada para workspaces de tipo "Negocio". Cambia a tu workspace de negocio (o crea
              uno en Ajustes) para llevar tus cuentas por cobrar y por pagar.
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Por cobrar</Text>
            {cobrar.length === 0 && <Text style={styles.empty}>Nada pendiente por cobrar.</Text>}
            {cobrar.map(renderItem)}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Por pagar</Text>
            {pagar.length === 0 && <Text style={styles.empty}>Nada pendiente por pagar.</Text>}
            {pagar.map(renderItem)}
          </View>

          <View style={styles.card}>
            <Text style={styles.subLabel}>Nuevo</Text>
            <View style={styles.typeRow}>
              <Pressable
                style={[styles.typeChip, direction === 'cobrar' && { backgroundColor: colors.ingreso, borderColor: colors.ingreso }]}
                onPress={() => setDirection('cobrar')}
              >
                <Text style={[styles.typeChipText, direction === 'cobrar' && styles.typeChipTextActive]}>Por cobrar</Text>
              </Pressable>
              <Pressable
                style={[styles.typeChip, direction === 'pagar' && { backgroundColor: colors.gasto, borderColor: colors.gasto }]}
                onPress={() => setDirection('pagar')}
              >
                <Text style={[styles.typeChipText, direction === 'pagar' && styles.typeChipTextActive]}>Por pagar</Text>
              </Pressable>
            </View>
            <TextInput
              style={[styles.input, { marginBottom: 8 }]}
              placeholder="Contraparte (ej. Cliente ABC)"
              placeholderTextColor={colors.textMuted}
              value={counterparty}
              onChangeText={setCounterparty}
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
              <TextInput
                style={[styles.input, { flex: 0.6 }]}
                placeholder="Días"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={daysAhead}
                onChangeText={setDaysAhead}
              />
              <Pressable
                style={[styles.addButton, (!counterparty.trim() || !amount) && styles.addButtonDisabled]}
                onPress={handleAdd}
                disabled={!counterparty.trim() || !amount}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
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
    content: { padding: 16, gap: 16, paddingBottom: 40 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
    cardHint: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
    empty: { fontSize: 13, color: colors.textMuted, paddingVertical: 4 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    checkbox: { marginRight: 10 },
    rowName: { fontSize: 14, fontWeight: '600', color: colors.text },
    rowNameDone: { textDecorationLine: 'line-through', color: colors.textMuted },
    rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    amount: { fontSize: 14, fontWeight: '700' },
    subLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8 },
    typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
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
