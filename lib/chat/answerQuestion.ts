import { endOfMonth, endOfWeek, endOfYear, format, startOfMonth, startOfWeek, startOfYear, subMonths, subYears } from 'date-fns';

import { formatCurrency } from '@/lib/format';
import {
  buildMonthContext,
  categoryTotals,
  categoryTxCounts,
  computeInvestmentCapacity,
  computeLivingCostMonthly,
  monthKey,
  sumByType,
} from '@/lib/insights/metrics';
import { Transaction } from '@/types/database';

export const FALLBACK_MESSAGE =
  'No estoy segura de cómo responder eso todavía. Puedo ayudarte con preguntas como: "¿En qué gasté más este mes?", "¿Cuánto he gastado en comida?", "¿Cuánto he gastado en transporte el mes pasado?", "¿Cómo van mis gastos este año?", "¿Cuánto he ahorrado?", "¿Puedo comprar algo de $X?" o "¿Cuánto puedo invertir?".';

const SAFE_MIN_MONTHS = 3;

function pluralMonths(n: number) {
  const rounded = Math.round(n);
  return `${rounded} mes${rounded === 1 ? '' : 'es'}`;
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function parseAmount(text: string): number | null {
  const t = text.toLowerCase();
  const millones = t.match(/(\d+(?:[.,]\d+)?)\s*(?:millones|millón|mill?)\b/);
  if (millones) return Math.round(parseFloat(millones[1].replace(',', '.')) * 1_000_000);
  const mil = t.match(/(\d+(?:[.,]\d+)?)\s*mil\b/);
  if (mil) return Math.round(parseFloat(mil[1].replace(',', '.')) * 1_000);
  const thousands = t.match(/\$?\s?(\d{1,3}(?:[.,]\d{3}){1,})/);
  if (thousands) return parseInt(thousands[1].replace(/[.,]/g, ''), 10);
  const plain = t.match(/\$?\s?(\d+)/);
  if (plain) return parseInt(plain[1], 10);
  return null;
}

const CATEGORY_ALIASES: Record<string, string> = {
  restaurantes: 'Comida',
  restaurante: 'Comida',
  comida: 'Comida',
  supermercado: 'Comida',
  mercado: 'Comida',
  transporte: 'Transporte',
  gasolina: 'Transporte',
  uber: 'Transporte',
  renta: 'Renta',
  arriendo: 'Renta',
  alquiler: 'Renta',
  servicios: 'Servicios',
  luz: 'Servicios',
  agua: 'Servicios',
  ventas: 'Ventas',
  salario: 'Salario',
  sueldo: 'Salario',
};

function detectCategory(normalizedQuestion: string): string | null {
  for (const [alias, categoryName] of Object.entries(CATEGORY_ALIASES)) {
    if (normalizedQuestion.includes(alias)) return categoryName;
  }
  return null;
}

export interface TimePeriod {
  start: string; // yyyy-MM-dd
  end: string;
  label: string;
}

// Detecta un período explícito en la pregunta ("el mes pasado", "este año"...). Si no hay
// ninguno, el resto del código sigue usando el mes actual por defecto (comportamiento previo).
function parseTimePeriod(normalizedQuestion: string, today: Date): TimePeriod | null {
  const q = normalizedQuestion;
  if (/ano pasado/.test(q)) {
    const lastYear = subYears(today, 1);
    return { start: format(startOfYear(lastYear), 'yyyy-MM-dd'), end: format(endOfYear(lastYear), 'yyyy-MM-dd'), label: 'el año pasado' };
  }
  if (/este ano|presente ano/.test(q)) {
    return { start: format(startOfYear(today), 'yyyy-MM-dd'), end: format(endOfYear(today), 'yyyy-MM-dd'), label: 'este año' };
  }
  if (/mes pasado/.test(q)) {
    const lastMonth = subMonths(today, 1);
    return { start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), end: format(endOfMonth(lastMonth), 'yyyy-MM-dd'), label: 'el mes pasado' };
  }
  if (/esta semana/.test(q)) {
    return {
      start: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      end: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      label: 'esta semana',
    };
  }
  if (/este mes/.test(q)) {
    return { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd'), label: 'este mes' };
  }
  return null;
}

function filterByPeriod(transactions: Transaction[], period: TimePeriod): Transaction[] {
  return transactions.filter((t) => t.occurred_on >= period.start && t.occurred_on <= period.end);
}

function answerPeriodSummary(period: TimePeriod, transactions: Transaction[]): string {
  const periodTx = filterByPeriod(transactions, period);
  const ingresos = sumByType(periodTx, 'ingreso');
  const gastos = sumByType(periodTx, 'gasto');
  const ahorro = sumByType(periodTx, 'ahorro');
  if (ingresos === 0 && gastos === 0 && ahorro === 0) {
    return `No tengo movimientos registrados para ${period.label}.`;
  }
  const balance = ingresos - gastos - ahorro;
  return `En ${period.label}: ingresos ${formatCurrency(ingresos)}, gastos ${formatCurrency(gastos)}, ahorro ${formatCurrency(ahorro)}. Balance: ${formatCurrency(balance)}.`;
}

// "Comida" agrupa supermercado y restaurantes; si un tipo domina el gasto del mes,
// lo describimos con ese término (así "Comida" se puede contestar como "restaurantes").
function describeCategorySpending(categoryName: string, currentMonthTx: Transaction[]): string {
  if (categoryName !== 'Comida') return categoryName.toLowerCase();

  const byNote = new Map<string, number>();
  for (const t of currentMonthTx) {
    if (t.type !== 'gasto' || t.category?.name !== 'Comida') continue;
    const note = normalize(t.note ?? 'otros');
    byNote.set(note, (byNote.get(note) ?? 0) + t.amount);
  }
  const total = Array.from(byNote.values()).reduce((a, b) => a + b, 0);
  if (total === 0) return 'comida';

  const [topNote, topAmount] = Array.from(byNote.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topAmount / total <= 0.5) return 'comida';
  if (topNote.includes('restaurante')) return 'restaurantes';
  if (topNote.includes('supermercado')) return 'el supermercado';
  return 'comida';
}

function answerPurchaseCapacity(amount: number, ctx: ReturnType<typeof buildMonthContext>, transactions: Transaction[]): string {
  const totalSavings = sumByType(transactions, 'ahorro');
  const livingCostMonthly = computeLivingCostMonthly(ctx);

  if (livingCostMonthly <= 0) {
    return `Tienes ${formatCurrency(totalSavings)} ahorrados, pero todavía no tengo suficiente historial de tus gastos esenciales para calcular el impacto de esta compra en tu fondo de emergencia.`;
  }

  const monthsCovered = totalSavings / livingCostMonthly;

  if (amount > totalSavings) {
    return `Con lo que llevas ahorrado (${formatCurrency(totalSavings)}, unos ${pluralMonths(monthsCovered)} de fondo de emergencia) no te alcanza para ${formatCurrency(amount)} sin financiamiento adicional. Te recomendaría seguir ahorrando o buscar un plan de pagos antes de hacer esta compra.`;
  }

  const remaining = totalSavings - amount;
  const newMonths = remaining / livingCostMonthly;

  if (newMonths >= SAFE_MIN_MONTHS) {
    return `Sí, te alcanza: después de la compra tu fondo de emergencia seguiría en unos ${pluralMonths(newMonths)}, un nivel saludable.`;
  }

  const avgMonthlyAhorro = sumByType(ctx.pastMonthsTx, 'ahorro') / ctx.pastMonthsCount;
  const shortfall = livingCostMonthly * SAFE_MIN_MONTHS - remaining;
  const monthsToWait = avgMonthlyAhorro > 0 ? Math.ceil(shortfall / avgMonthlyAhorro) : null;
  const waitPhrase =
    monthsToWait && monthsToWait > 0 ? ` Lo recomendable sería esperar ${pluralMonths(monthsToWait)} más ahorrando a tu ritmo actual.` : '';

  return `Sí, pero reducirías tu fondo de emergencia de ${pluralMonths(monthsCovered)} a ${pluralMonths(newMonths)}.${waitPhrase}`;
}

function answerTopCategory(ctx: ReturnType<typeof buildMonthContext>, transactions: Transaction[]): string {
  const currentTotals = categoryTotals(ctx.currentMonthTx, 'gasto');
  if (currentTotals.size === 0) return 'Todavía no registras gastos este mes.';

  // Ignoramos pagos únicos (ej. renta) para esta pregunta: casi siempre serían "lo más caro"
  // sin que eso sea una noticia interesante — lo que la gente quiere saber es en qué gastó
  // de más día a día (comida, transporte, etc.).
  const pastCounts = categoryTxCounts(ctx.pastMonthsTx, 'gasto');
  const isRecurring = (name: string) => (pastCounts.get(name) ?? 0) / ctx.pastMonthsCount >= 1.5;
  let candidates = Array.from(currentTotals.entries()).filter(([name]) => isRecurring(name));
  if (candidates.length === 0) candidates = Array.from(currentTotals.entries());

  const [topName, topTotal] = candidates.sort((a, b) => b[1] - a[1])[0];
  const prevKey = monthKey(subMonths(ctx.today, 1).toISOString());
  const prevMonthTx = transactions.filter((t) => monthKey(t.occurred_on) === prevKey);
  const prevTotal = categoryTotals(prevMonthTx, 'gasto').get(topName) ?? 0;
  const label = describeCategorySpending(topName, ctx.currentMonthTx);

  if (prevTotal > 0) {
    const pct = Math.round(((topTotal - prevTotal) / prevTotal) * 100);
    const comparator = pct >= 0 ? 'más' : 'menos';
    return `Gastaste ${formatCurrency(topTotal)} en ${label}, un ${Math.abs(pct)}% ${comparator} que el mes anterior.`;
  }
  return `Gastaste ${formatCurrency(topTotal)} en ${label} este mes (no tengo datos del mes anterior para comparar).`;
}

function answerSpendAmount(
  normalizedQuestion: string,
  ctx: ReturnType<typeof buildMonthContext>,
  transactions: Transaction[],
  period: TimePeriod | null
): string {
  const categoryName = detectCategory(normalizedQuestion);
  const scopedTx = period ? filterByPeriod(transactions, period) : ctx.currentMonthTx;
  const periodLabel = period ? period.label : 'este mes';
  const totals = categoryTotals(scopedTx, 'gasto');

  if (categoryName) {
    const total = totals.get(categoryName) ?? 0;
    const label = describeCategorySpending(categoryName, scopedTx);
    return total > 0
      ? `Llevas gastados ${formatCurrency(total)} en ${label} ${periodLabel}.`
      : `No registras gastos en ${categoryName.toLowerCase()} ${periodLabel}.`;
  }

  const total = Array.from(totals.values()).reduce((a, b) => a + b, 0);
  return `Llevas gastados ${formatCurrency(total)} en total ${periodLabel}.`;
}

function answerInvestment(ctx: ReturnType<typeof buildMonthContext>, transactions: Transaction[]): string {
  const investable = computeInvestmentCapacity(ctx, transactions);
  if (investable == null) {
    return 'Todavía no tengo suficiente historial de meses completos para calcular cuánto podrías invertir sin afectar tu día a día.';
  }
  return `Con tu flujo de caja promedio de los últimos meses, podrías destinar unos ${formatCurrency(investable)} a inversión sin afectar tu día a día.`;
}

function answerBalance(ctx: ReturnType<typeof buildMonthContext>): string {
  const ingresos = sumByType(ctx.currentMonthTx, 'ingreso');
  const gastos = sumByType(ctx.currentMonthTx, 'gasto');
  const ahorro = sumByType(ctx.currentMonthTx, 'ahorro');
  const balance = ingresos - gastos - ahorro;
  return `Este mes: ingresos ${formatCurrency(ingresos)}, gastos ${formatCurrency(gastos)}, ahorro ${formatCurrency(ahorro)}. Balance: ${formatCurrency(balance)}.`;
}

function answerIncome(ctx: ReturnType<typeof buildMonthContext>): string {
  const total = sumByType(ctx.currentMonthTx, 'ingreso');
  return `Este mes has ingresado ${formatCurrency(total)}.`;
}

function answerSavings(ctx: ReturnType<typeof buildMonthContext>, transactions: Transaction[]): string {
  const thisMonth = sumByType(ctx.currentMonthTx, 'ahorro');
  const total = sumByType(transactions, 'ahorro');
  return `Este mes has ahorrado ${formatCurrency(thisMonth)}. En total llevas ${formatCurrency(total)} ahorrados.`;
}

export function answerQuestion(question: string, transactions: Transaction[], today: Date = new Date()): string {
  const q = normalize(question);
  const ctx = buildMonthContext(transactions, today);
  const amount = parseAmount(question);
  const period = parseTimePeriod(q, today);

  if (amount && /(puedo comprar|me alcanza|puedo gastar|deberia comprar|debo comprar)/.test(q)) {
    return answerPurchaseCapacity(amount, ctx, transactions);
  }
  if (/(en que|donde).*(gast)|mayor gasto/.test(q)) {
    return answerTopCategory(ctx, transactions);
  }
  if (/(cuanto puedo invertir|capacidad de inversion)/.test(q)) {
    return answerInvestment(ctx, transactions);
  }
  if (/cuanto.*(gane|ingres|entro)|ingresos/.test(q)) {
    return answerIncome(ctx);
  }
  if (/cuanto.*ahorr/.test(q)) {
    return answerSavings(ctx, transactions);
  }
  if (/cuanto.*(he gastado|gaste|gasto)/.test(q)) {
    return answerSpendAmount(q, ctx, transactions, period);
  }
  if (/(como voy|como estoy|como van|como vamos|balance|resumen|gastos)/.test(q)) {
    return period ? answerPeriodSummary(period, transactions) : answerBalance(ctx);
  }

  return FALLBACK_MESSAGE;
}
