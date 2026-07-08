import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { typeLabels } from '@/constants/theme';
import { Transaction } from '@/types/database';

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildTransactionsCsv(transactions: Transaction[]): string {
  const header = ['Fecha', 'Tipo', 'Categoría', 'Cuenta', 'Monto', 'Nota'];
  const rows = transactions.map((t) => [
    t.occurred_on,
    typeLabels[t.type],
    t.category?.name ?? '',
    t.account?.name ?? '',
    t.amount.toFixed(2),
    t.note ?? '',
  ]);
  return [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(',')).join('\n');
}

export async function exportTransactionsCsv(transactions: Transaction[], fileName = 'kuenta-movimientos.csv') {
  const csv = buildTransactionsCsv(transactions);

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
    await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar movimientos' });
  }
}
