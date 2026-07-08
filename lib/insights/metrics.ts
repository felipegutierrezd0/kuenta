import { getDate, getDaysInMonth } from 'date-fns';

import { Debt, EntryType, Transaction } from '@/types/database';

export const ESSENTIAL_CATEGORIES = new Set(['Renta', 'Servicios']);
export const LIVING_COST_CATEGORIES = new Set(['Renta', 'Servicios', 'Comida', 'Transporte']);

export function monthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

export function sumBy<T>(items: T[], amountOf: (item: T) => number) {
  return items.reduce((acc, item) => acc + amountOf(item), 0);
}

export function sumByType(transactions: Transaction[], type: EntryType) {
  return sumBy(
    transactions.filter((t) => t.type === type),
    (t) => t.amount
  );
}

export function netOf(transactions: Transaction[]) {
  const ingresos = sumByType(transactions, 'ingreso');
  const salidas = sumByType(transactions, 'gasto') + sumByType(transactions, 'ahorro');
  return ingresos - salidas;
}

export interface MonthContext {
  today: Date;
  currentKey: string;
  dayOfMonth: number;
  daysInMonth: number;
  elapsedFraction: number;
  currentMonthTx: Transaction[];
  pastMonthsTx: Transaction[];
  pastMonthsCount: number;
}

export function buildMonthContext(transactions: Transaction[], today: Date = new Date()): MonthContext {
  const currentKey = monthKey(today.toISOString());
  const dayOfMonth = getDate(today);
  const daysInMonth = getDaysInMonth(today);
  const elapsedFraction = Math.max(dayOfMonth / daysInMonth, 1 / daysInMonth);
  const currentMonthTx = transactions.filter((t) => monthKey(t.occurred_on) === currentKey);
  const pastMonthsTx = transactions.filter((t) => monthKey(t.occurred_on) !== currentKey);
  const pastMonthsCount = new Set(pastMonthsTx.map((t) => monthKey(t.occurred_on))).size || 1;
  return { today, currentKey, dayOfMonth, daysInMonth, elapsedFraction, currentMonthTx, pastMonthsTx, pastMonthsCount };
}

export function categoryTotals(transactions: Transaction[], type: EntryType): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== type) continue;
    const name = t.category?.name ?? 'Sin categoría';
    map.set(name, (map.get(name) ?? 0) + t.amount);
  }
  return map;
}

export function categoryTxCounts(transactions: Transaction[], type: EntryType): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== type) continue;
    const name = t.category?.name ?? 'Sin categoría';
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return map;
}

export function monthlyNetByMonth(transactions: Transaction[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of transactions) {
    const key = monthKey(t.occurred_on);
    const delta = t.type === 'ingreso' ? t.amount : -t.amount;
    map.set(key, (map.get(key) ?? 0) + delta);
  }
  return map;
}

export function cumulativeBalanceOf(transactions: Transaction[]): number {
  return Array.from(monthlyNetByMonth(transactions).values()).reduce((a, b) => a + b, 0);
}

export function computeCashRunway(ctx: MonthContext, transactions: Transaction[]) {
  const cumulativeBalance = cumulativeBalanceOf(transactions);
  const currentMonthNet = netOf(ctx.currentMonthTx);
  const dailyNet = currentMonthNet / ctx.dayOfMonth;
  return { cumulativeBalance, dailyNet };
}

export function computeInvestmentCapacity(ctx: MonthContext, transactions: Transaction[]): number | null {
  const netByMonth = monthlyNetByMonth(transactions);
  const pastComplete = Array.from(netByMonth.entries()).filter(([key]) => key !== ctx.currentKey);
  if (pastComplete.length === 0) return null;
  const avgNet = pastComplete.reduce((a, [, net]) => a + net, 0) / pastComplete.length;
  if (avgNet <= 50) return null;
  return avgNet * 0.7;
}

export interface DebtPriority {
  sorted: Debt[];
  first: Debt;
  second: Debt | null;
}

export function computeDebtPriority(debts: Debt[]): DebtPriority | null {
  if (debts.length === 0) return null;
  const sorted = [...debts].sort((a, b) => b.interest_rate - a.interest_rate);
  return { sorted, first: sorted[0], second: sorted[1] ?? null };
}

export interface CategoryOverrun {
  name: string;
  pct: number;
  total: number;
}

export function computeCategoryOverrun(ctx: MonthContext): CategoryOverrun | null {
  const current = categoryTotals(ctx.currentMonthTx, 'gasto');
  const past = categoryTotals(ctx.pastMonthsTx, 'gasto');
  const pastCounts = categoryTxCounts(ctx.pastMonthsTx, 'gasto');

  let worst: CategoryOverrun | null = null;
  for (const [name, total] of current) {
    const avgMonthly = (past.get(name) ?? 0) / ctx.pastMonthsCount;
    if (avgMonthly < 20) continue;
    const avgTxPerMonth = (pastCounts.get(name) ?? 0) / ctx.pastMonthsCount;
    if (avgTxPerMonth < 1.5) continue; // pago único (ej. renta): no se prorratea
    const proratedAvg = avgMonthly * ctx.elapsedFraction;
    const pct = ((total - proratedAvg) / proratedAvg) * 100;
    if (pct > 10 && (!worst || pct > worst.pct)) worst = { name, pct, total };
  }
  return worst;
}

export function computeDiscretionarySavings(ctx: MonthContext): number {
  const current = categoryTotals(ctx.currentMonthTx, 'gasto');
  const discretionaryTotal = Array.from(current.entries())
    .filter(([name]) => !ESSENTIAL_CATEGORIES.has(name))
    .reduce((acc, [, total]) => acc + total, 0);
  return discretionaryTotal * 0.2;
}

export function computeLivingCostMonthly(ctx: MonthContext): number {
  const past = categoryTotals(ctx.pastMonthsTx, 'gasto');
  let total = 0;
  for (const [name, amount] of past) {
    if (LIVING_COST_CATEGORIES.has(name)) total += amount;
  }
  return total / ctx.pastMonthsCount;
}
