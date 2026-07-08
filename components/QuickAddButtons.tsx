import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useColors } from '@/lib/ThemeProvider';
import { EntryType } from '@/types/database';

function buildButtons(
  colors: ThemeColors
): { type: EntryType; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; bg: string }[] {
  return [
    { type: 'ingreso', label: 'Ingreso', icon: 'arrow-down-circle', color: colors.ingreso, bg: colors.ingresoBg },
    { type: 'gasto', label: 'Gasto', icon: 'arrow-up-circle', color: colors.gasto, bg: colors.gastoBg },
    { type: 'ahorro', label: 'Ahorro', icon: 'piggy-bank', color: colors.ahorro, bg: colors.ahorroBg },
  ];
}

export function QuickAddButtons() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const buttons = useMemo(() => buildButtons(colors), [colors]);
  return (
    <View style={styles.row}>
      {buttons.map((btn) => (
        <Pressable
          key={btn.type}
          style={[styles.button, { backgroundColor: btn.bg }]}
          onPress={() => router.push({ pathname: '/(app)/add', params: { type: btn.type } })}
        >
          <MaterialCommunityIcons name={btn.icon} size={26} color={btn.color} />
          <Text style={[styles.label, { color: btn.color }]}>{btn.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
