import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/lib/ThemeProvider';
import { Transaction } from '@/types/database';

const SIGN: Record<Transaction['type'], string> = {
  ingreso: '+',
  gasto: '-',
  ahorro: '-',
};

export function TransactionListItem({ transaction }: { transaction: Transaction }) {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const color = colors[transaction.type];
  const iconName = (transaction.category?.icon as keyof typeof MaterialCommunityIcons.glyphMap) ?? 'circle-outline';

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
        <MaterialCommunityIcons name={iconName} size={20} color={color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.category}>{transaction.category?.name ?? 'Sin categoría'}</Text>
        <Text style={styles.meta}>
          {format(parseISO(transaction.occurred_on), "d 'de' MMM", { locale: es })}
          {transaction.note ? ` · ${transaction.note}` : ''}
        </Text>
      </View>
      <Text style={[styles.amount, { color }]}>
        {SIGN[transaction.type]}
        {formatCurrency(transaction.amount)}
      </Text>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  category: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
