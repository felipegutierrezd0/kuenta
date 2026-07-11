import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { jsPDF } from 'jspdf';
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

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// HTML usado en iOS/Android: expo-print lo renderiza a PDF con su motor nativo (WebView),
// así que aquí sí podemos maquetar con CSS normal.
function buildAnnualSummaryHtml(summary: AnnualSummary): string {
  const money = (n: number) => `$${n.toFixed(2)}`;
  const row = (a: string, b: string) => `<tr><td>${escapeHtml(a)}</td><td class="right">${b}</td></tr>`;
  const incomeRows =
    summary.incomeByCategory.map((c) => row(c.name, money(c.total))).join('') ||
    `<tr><td colspan="2">Sin ingresos registrados en ${summary.year}.</td></tr>`;
  const expenseRows =
    summary.expenseByCategory.map((c) => row(c.name, money(c.total))).join('') ||
    `<tr><td colspan="2">Sin gastos registrados en ${summary.year}.</td></tr>`;
  const monthlyRows = summary.monthly
    .map(
      (m) =>
        `<tr><td>${MONTH_NAMES[m.month]}</td><td class="right">${money(m.income)}</td><td class="right">${money(m.expense)}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; padding: 24px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 14px; margin-top: 24px; margin-bottom: 8px; }
  p.hint { color: #666; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td, th { padding: 6px 4px; border-bottom: 1px solid #e5e5e5; text-align: left; }
  .right { text-align: right; }
  .totals td { font-weight: bold; }
</style></head>
<body>
  <h1>Resumen anual ${summary.year}</h1>
  <p class="hint">Punto de partida para tu declaración de impuestos, no sustituye la asesoría de tu contador.</p>
  <table class="totals">
    ${row('Total ingresos', money(summary.totalIncome))}
    ${row('Total gastos', money(summary.totalExpense))}
    ${row('Total ahorro', money(summary.totalSavings))}
    ${row('Neto del año', money(summary.net))}
  </table>
  <h2>Ingresos por categoría</h2>
  <table>${incomeRows}</table>
  <h2>Gastos por categoría</h2>
  <table>${expenseRows}</table>
  <h2>Desglose mensual</h2>
  <table>
    <tr><th>Mes</th><th class="right">Ingresos</th><th class="right">Gastos</th></tr>
    ${monthlyRows}
  </table>
</body></html>`;
}

// En web, expo-print solo abre el diálogo de impresión del navegador y no acepta el HTML como
// contenido (ignora la opción `html`), así que ahí generamos el PDF nosotros mismos con jsPDF y
// lo descargamos como un archivo normal, igual que el resto de exportaciones de la app.
async function exportAnnualSummaryPdfWeb(summary: AnnualSummary, fileName: string) {
  const doc = new jsPDF();
  const money = (n: number) => `$${n.toFixed(2)}`;
  const left = 14;
  const right = 196;
  const lineHeight = 7;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  function ensureSpace(next = lineHeight) {
    if (y + next > pageHeight - 15) {
      doc.addPage();
      y = 20;
    }
  }

  function totalsRow(label: string, value: string) {
    ensureSpace();
    doc.text(label, left, y);
    doc.text(value, right, y, { align: 'right' });
    y += lineHeight;
  }

  function sectionTitle(title: string) {
    ensureSpace(10);
    doc.setFontSize(12);
    doc.text(title, left, y);
    doc.setFontSize(10);
    y += lineHeight;
  }

  function categoryRows(items: CategoryTotal[], emptyLabel: string) {
    if (items.length === 0) {
      ensureSpace();
      doc.text(emptyLabel, left, y);
      y += lineHeight;
      return;
    }
    for (const c of items) {
      ensureSpace();
      doc.text(c.name, left, y);
      doc.text(money(c.total), right, y, { align: 'right' });
      y += lineHeight;
    }
  }

  doc.setFontSize(16);
  doc.text(`Resumen anual ${summary.year}`, left, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('Punto de partida para tu declaración de impuestos, no sustituye la asesoría de tu contador.', left, y);
  doc.setTextColor(20);
  y += 10;

  doc.setFontSize(11);
  totalsRow('Total ingresos', money(summary.totalIncome));
  totalsRow('Total gastos', money(summary.totalExpense));
  totalsRow('Total ahorro', money(summary.totalSavings));
  totalsRow('Neto del año', money(summary.net));
  y += 4;

  sectionTitle('Ingresos por categoría');
  categoryRows(summary.incomeByCategory, `Sin ingresos registrados en ${summary.year}.`);
  y += 4;

  sectionTitle('Gastos por categoría');
  categoryRows(summary.expenseByCategory, `Sin gastos registrados en ${summary.year}.`);
  y += 4;

  sectionTitle('Desglose mensual');
  ensureSpace();
  doc.setFont('helvetica', 'bold');
  doc.text('Mes', left, y);
  doc.text('Ingresos', 130, y, { align: 'right' });
  doc.text('Gastos', right, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += lineHeight;
  for (const m of summary.monthly) {
    ensureSpace();
    doc.text(MONTH_NAMES[m.month], left, y);
    doc.text(money(m.income), 130, y, { align: 'right' });
    doc.text(money(m.expense), right, y, { align: 'right' });
    y += lineHeight;
  }

  doc.save(fileName);
}

export async function exportAnnualSummaryPdf(summary: AnnualSummary) {
  const fileName = `kuenta-resumen-${summary.year}.pdf`;

  if (Platform.OS === 'web') {
    await exportAnnualSummaryPdfWeb(summary, fileName);
    return;
  }

  const html = buildAnnualSummaryHtml(summary);
  const { uri } = await Print.printToFileAsync({ html });
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.moveAsync({ from: uri, to: fileUri });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'Exportar resumen anual' });
  }
}
