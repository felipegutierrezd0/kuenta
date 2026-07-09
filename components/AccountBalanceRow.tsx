import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import { AccountBalance } from '@/lib/queries/useAccounts';
import { useColors } from '@/lib/ThemeProvider';

const KIND_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  banco: 'bank',
  efectivo: 'cash',
  tarjeta: 'credit-card-outline',
  otro: 'wallet-outline',
};

export function AccountBalanceRow({
  accounts,
  sinCuentaBalance,
  total,
}: {
  accounts: AccountBalance[];
  sinCuentaBalance: number;
  total: number;
}) {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  if (accounts.length === 0 && sinCuentaBalance === 0) {
    return (
      <Pressable style={styles.emptyCard} onPress={() => router.push('/(app)/accounts')}>
        <MaterialCommunityIcons name="wallet-plus-outline" size={18} color={colors.primary} />
        <Text style={styles.emptyText}>Agrega tus cuentas para ver saldos reales</Text>
      </Pressable>
    );
  }

  return (
    <View>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Saldo total</Text>
        <Text style={[styles.totalValue, { color: total >= 0 ? colors.text : colors.gasto }]}>
          {formatCurrency(total)}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {accounts.map((account) => (
          <Pressable key={account.id} style={styles.card} onPress={() => router.push('/(app)/accounts')}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={KIND_ICONS[account.kind] ?? 'wallet-outline'} size={16} color={colors.primary} />
            </View>
            <Text style={styles.name} numberOfLines={1}>{account.name}</Text>
            <Text style={[styles.balance, { color: account.balance >= 0 ? colors.text : colors.gasto }]}>
              {formatCurrency(account.balance)}
            </Text>
          </Pressable>
        ))}
        {sinCuentaBalance !== 0 && (
          <Pressable style={styles.card} onPress={() => router.push('/(app)/accounts')}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="help-circle-outline" size={16} color={colors.textMuted} />
            </View>
            <Text style={styles.name} numberOfLines={1}>Sin cuenta</Text>
            <Text style={[styles.balance, { color: sinCuentaBalance >= 0 ? colors.text : colors.gasto }]}>
              {formatCurrency(sinCuentaBalance)}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 2,
      marginBottom: 8,
    },
    totalLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
    totalValue: { fontSize: 16, fontWeight: '700' },
    row: { gap: 10, paddingVertical: 2 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      minWidth: 130,
    },
    iconWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.ahorroBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    name: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
    balance: { fontSize: 15, fontWeight: '700' },
    emptyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.ahorroBg,
      borderRadius: 14,
      padding: 14,
    },
    emptyText: { fontSize: 13, color: colors.primary, fontWeight: '600', flex: 1 },
  });
