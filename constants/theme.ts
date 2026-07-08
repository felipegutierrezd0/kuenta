// Paleta tomada del isotipo de Kuenta (el azul y el rojo/vino de las dos flechas).
export const lightColors = {
  background: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  primary: '#1e3f86', // azul del isotipo
  secondary: '#7a2a2a', // rojo vino del isotipo (workspaces "negocio", acentos)
  ingreso: '#16a34a',
  gasto: '#dc2626',
  ahorro: '#2563eb',
  ingresoBg: '#dcfce7',
  gastoBg: '#fee2e2',
  ahorroBg: '#dbeafe',
  warning: '#d97706',
  warningBg: '#fef3c7',
  secondaryBg: '#f3e0e0',
};

export const darkColors: ThemeColors = {
  background: '#0b1220',
  card: '#141b2d',
  border: '#293349',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  primary: '#6b8fe8',
  secondary: '#d38080',
  ingreso: '#4ade80',
  gasto: '#f87171',
  ahorro: '#60a5fa',
  ingresoBg: 'rgba(74, 222, 128, 0.16)',
  gastoBg: 'rgba(248, 113, 113, 0.16)',
  ahorroBg: 'rgba(96, 165, 250, 0.16)',
  warning: '#fbbf24',
  warningBg: 'rgba(251, 191, 36, 0.18)',
  secondaryBg: 'rgba(211, 128, 128, 0.16)',
};

export type ThemeColors = typeof lightColors;

// Compatibilidad con imports estáticos existentes (paleta clara por defecto).
// Las pantallas deben preferir `useColors()` de `@/lib/ThemeProvider` para soportar modo oscuro.
export const colors = lightColors;

export function getToneColors(
  colors: ThemeColors
): Record<'danger' | 'warning' | 'success' | 'info', { fg: string; bg: string }> {
  return {
    danger: { fg: colors.gasto, bg: colors.gastoBg },
    warning: { fg: colors.warning, bg: colors.warningBg },
    success: { fg: colors.ingreso, bg: colors.ingresoBg },
    info: { fg: colors.primary, bg: colors.ahorroBg },
  };
}

export function getTypeColors(colors: ThemeColors): Record<'ingreso' | 'gasto' | 'ahorro', string> {
  return {
    ingreso: colors.ingreso,
    gasto: colors.gasto,
    ahorro: colors.ahorro,
  };
}

export const toneColors = getToneColors(lightColors);
export const typeColors = getTypeColors(lightColors);

export const typeLabels: Record<'ingreso' | 'gasto' | 'ahorro', string> = {
  ingreso: 'Ingreso',
  gasto: 'Gasto',
  ahorro: 'Ahorro',
};
