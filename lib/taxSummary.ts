import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { EntryType, Transaction } from '@/types/database';

export interface CategoryTotal {
  name: string;
  total: number;
}

export interface MonthTotal {
  month: number; // 0-11
  income: number;
  expense: number;
  savings: number;
}

export interface AnnualSummary {
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  net: number;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
  monthly: MonthTotal[];
}

function sumByCategory(transactions: Transaction[], type: EntryType): CategoryTotal[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== type) continue;
    const name = t.category?.name ?? 'Sin categoría';
    map.set(name, (map.get(name) ?? 0) + t.amount);
  }
  return Array.from(map.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

// Resume un año completo de movimientos: totales por tipo, desglose por categoría (útil para
// declarar ingresos/deducciones) y un desglose mensual (útil para pagos provisionales o IVA
// trimestral). No sustituye asesoría fiscal, es un punto de partida para tu contador.
export function computeAnnualSummary(transactions: Transaction[], year: number): AnnualSummary {
  const yearTx = transactions.filter((t) => t.occurred_on.startsWith(`${year}-`));

  const totalIncome = yearTx.filter((t) => t.type === 'ingreso').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = yearTx.filter((t) => t.type === 'gasto').reduce((sum, t) => sum + t.amount, 0);
  const totalSavings = yearTx.filter((t) => t.type === 'ahorro').reduce((sum, t) => sum + t.amount, 0);

  const monthly: MonthTotal[] = Array.from({ length: 12 }, (_, month) => {
    const monthTx = yearTx.filter((t) => new Date(`${t.occurred_on}T00:00:00`).getMonth() === month);
    return {
      month,
      income: monthTx.filter((t) => t.type === 'ingreso').reduce((sum, t) => sum + t.amount, 0),
      expense: monthTx.filter((t) => t.type === 'gasto').reduce((sum, t) => sum + t.amount, 0),
      savings: monthTx.filter((t) => t.type === 'ahorro').reduce((sum, t) => sum + t.amount, 0),
    };
  });

  return {
    year,
    totalIncome,
    totalExpense,
    totalSavings,
    net: totalIncome - totalExpense - totalSavings,
    incomeByCategory: sumByCategory(yearTx, 'ingreso'),
    expenseByCategory: sumByCategory(yearTx, 'gasto'),
    monthly,
  };
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildAnnualSummaryCsv(summary: AnnualSummary): string {
  const lines: string[] = [];
  lines.push(`Resumen anual ${summary.year}`);
  lines.push('');
  lines.push(['Total ingresos', summary.totalIncome.toFixed(2)].join(','));
  lines.push(['Total gastos', summary.totalExpense.toFixed(2)].join(','));
  lines.push(['Total ahorro', summary.totalSavings.toFixed(2)].join(','));
  lines.push(['Neto', summary.net.toFixed(2)].join(','));
  lines.push('');
  lines.push('Ingresos por categoría');
  lines.push(['Categoría', 'Total'].join(','));
  for (const c of summary.incomeByCategory) lines.push([csvEscape(c.name), c.total.toFixed(2)].join(','));
  lines.push('');
  lines.push('Gastos por categoría');
  lines.push(['Categoría', 'Total'].join(','));
  for (const c of summary.expenseByCategory) lines.push([csvEscape(c.name), c.total.toFixed(2)].join(','));
  lines.push('');
  lines.push('Desglose mensual');
  lines.push(['Mes', 'Ingresos', 'Gastos', 'Ahorro'].join(','));
  for (const m of summary.monthly) {
    lines.push([MONTH_NAMES[m.month], m.income.toFixed(2), m.expense.toFixed(2), m.savings.toFixed(2)].join(','));
  }
  return lines.join('\n');
}

export async function exportAnnualSummaryCsv(summary: AnnualSummary) {
  const csv = buildAnnualSummaryCsv(summary);
  const fileName = `kuenta-resumen-${summary.year}.csv`;

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar resumen anual' });
  }
}
