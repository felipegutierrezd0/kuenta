import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useColors } from '@/lib/ThemeProvider';
import { Transaction } from '@/types/database';

export function UncategorizedBanner({ transactions }: { transactions: Transaction[] }) {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const count = transactions.filter((t) => !t.category_id).length;
  if (count === 0) return null;

  return (
    <Pressable style={styles.card} onPress={() => router.push('/(app)/uncategorized')}>
      <MaterialCommunityIcons name="shape-outline" size={18} color={colors.warning} />
      <Text style={styles.text}>
        {count === 1
          ? 'Tienes 1 movimiento sin categoría.'
          : `Tienes ${count} movimientos sin categoría.`}{' '}
        <Text style={styles.link}>Categorizar ahora</Text>
      </Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.warningBg,
      borderRadius: 16,
      padding: 14,
    },
    text: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
    link: { fontWeight: '700', color: colors.primary },
  });
