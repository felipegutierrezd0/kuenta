// No asumimos una moneda específica (la app es para varios países) — solo damos formato numérico con separadores.
export function formatCurrency(amount: number) {
  const formatted = new Intl.NumberFormat('es', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${amount < 0 ? '-' : ''}$${formatted}`;
}
