// Paleta tomada del isotipo de Kuenta (el azul y el rojo/vino de las dos flechas).
export const colors = {
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

export const toneColors: Record<'danger' | 'warning' | 'success' | 'info', { fg: string; bg: string }> = {
  danger: { fg: colors.gasto, bg: colors.gastoBg },
  warning: { fg: colors.warning, bg: colors.warningBg },
  success: { fg: colors.ingreso, bg: colors.ingresoBg },
  info: { fg: colors.primary, bg: colors.ahorroBg },
};

export const typeLabels: Record<'ingreso' | 'gasto' | 'ahorro', string> = {
  ingreso: 'Ingreso',
  gasto: 'Gasto',
  ahorro: 'Ahorro',
};

export const typeColors: Record<'ingreso' | 'gasto' | 'ahorro', string> = {
  ingreso: colors.ingreso,
  gasto: colors.gasto,
  ahorro: colors.ahorro,
};
