import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

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
  const [viewingReceipt, setViewingReceipt] = useState(false);

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
      {transaction.receipt_url && (
        <Pressable onPress={() => setViewingReceipt(true)} hitSlop={8} style={styles.receiptBadge}>
          <MaterialCommunityIcons name="paperclip" size={16} color={colors.textMuted} />
        </Pressable>
      )}
      <Text style={[styles.amount, { color }]}>
        {SIGN[transaction.type]}
        {formatCurrency(transaction.amount)}
      </Text>

      {transaction.receipt_url && (
        <Modal visible={viewingReceipt} transparent animationType="fade" onRequestClose={() => setViewingReceipt(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setViewingReceipt(false)}>
            <Image source={{ uri: transaction.receipt_url }} style={styles.modalImage} resizeMode="contain" />
            <Pressable style={styles.modalClose} onPress={() => setViewingReceipt(false)}>
              <MaterialCommunityIcons name="close" size={26} color="#fff" />
            </Pressable>
          </Pressable>
        </Modal>
      )}
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
  receiptBadge: {
    padding: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '90%',
    height: '70%',
  },
  modalClose: {
    position: 'absolute',
    top: 50,
    right: 24,
  },
});
