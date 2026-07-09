import { addDays, getDate, getDaysInMonth } from 'date-fns';

import { Budget, Debt, EntryType, RecurringTransaction, SavingsGoal, Transaction } from '@/types/database';

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

export interface BudgetOverrun {
  categoryName: string;
  projected: number;
  limit: number;
  pct: number;
}

// A diferencia de computeCategoryOverrun (que compara contra el promedio histórico), esta
// función usa el límite explícito que el usuario definió en Presupuestos, proyectando el gasto
// del mes en curso al ritmo actual (total / fracción transcurrida del mes).
export function computeBudgetOverrun(ctx: MonthContext, budgets: Budget[]): BudgetOverrun | null {
  if (budgets.length === 0) return null;
  const current = categoryTotals(ctx.currentMonthTx, 'gasto');

  let worst: BudgetOverrun | null = null;
  for (const budget of budgets) {
    const categoryName = budget.category?.name;
    if (!categoryName) continue;
    const spent = current.get(categoryName) ?? 0;
    const projected = spent / ctx.elapsedFraction;
    if (projected <= budget.monthly_limit) continue;
    const pct = ((projected - budget.monthly_limit) / budget.monthly_limit) * 100;
    if (!worst || pct > worst.pct) worst = { categoryName, projected, limit: budget.monthly_limit, pct };
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

export interface HealthScoreBreakdownItem {
  label: string;
  points: number;
  max: number;
}

export interface FinancialHealthScore {
  score: number;
  breakdown: HealthScoreBreakdownItem[];
}

// Puntaje simple 0-100 que combina cuatro señales ya calculadas en otras partes de este archivo.
// Es una guía orientativa, no un dictamen financiero: cada componente tiene un tope fijo de puntos
// para que el usuario pueda ver en qué área está bien y en cuál no.
export function computeFinancialHealthScore(
  transactions: Transaction[],
  debts: Debt[],
  budgets: Budget[],
  today: Date = new Date()
): FinancialHealthScore {
  const ctx = buildMonthContext(transactions, today);
  const breakdown: HealthScoreBreakdownItem[] = [];

  // Tasa de ahorro (hasta 30 pts): 20% de los ingresos ahorrados ya es el máximo.
  const totalIngresos = sumByType(transactions, 'ingreso');
  const totalAhorro = sumByType(transactions, 'ahorro');
  const savingsRate = totalIngresos > 0 ? totalAhorro / totalIngresos : 0;
  breakdown.push({ label: 'Tasa de ahorro', points: Math.round(Math.min(1, savingsRate / 0.2) * 30), max: 30 });

  // Deuda vs. ingreso anualizado (hasta 25 pts).
  const totalDebt = sumBy(debts, (d) => d.balance);
  const avgMonthlyIncome = totalIngresos / (ctx.pastMonthsCount + 1);
  const debtRatio = avgMonthlyIncome > 0 ? totalDebt / (avgMonthlyIncome * 12) : totalDebt > 0 ? 1 : 0;
  breakdown.push({ label: 'Deuda vs. ingresos', points: Math.round(Math.max(0, 1 - Math.min(1, debtRatio)) * 25), max: 25 });

  // Cumplimiento de presupuesto (hasta 25 pts). Sin presupuestos definidos, no penalizamos.
  let budgetPoints = 25;
  if (budgets.length > 0) {
    const current = categoryTotals(ctx.currentMonthTx, 'gasto');
    const overrunCount = budgets.filter((b) => {
      if (!b.category?.name) return false;
      const spent = current.get(b.category.name) ?? 0;
      return spent / ctx.elapsedFraction > b.monthly_limit;
    }).length;
    budgetPoints = Math.round(((budgets.length - overrunCount) / budgets.length) * 25);
  }
  breakdown.push({ label: 'Cumplimiento de presupuesto', points: budgetPoints, max: 25 });

  // Colchón de caja / cash runway (hasta 20 pts).
  const { cumulativeBalance, dailyNet } = computeCashRunway(ctx, transactions);
  let runwayPoints = 20;
  if (dailyNet < 0) {
    const daysLeft = cumulativeBalance > 0 ? cumulativeBalance / Math.abs(dailyNet) : 0;
    runwayPoints = Math.round(Math.max(0, Math.min(1, daysLeft / 90)) * 20);
  }
  breakdown.push({ label: 'Colchón de caja', points: runwayPoints, max: 20 });

  const score = breakdown.reduce((acc, b) => acc + b.points, 0);
  return { score, breakdown };
}

function recurringOccurrencesInWindow(recurring: RecurringTransaction, today: Date, daysAhead: number): number {
  const stepDays = recurring.frequency === 'semanal' ? 7 : recurring.frequency === 'quincenal' ? 15 : 30;
  const horizon = addDays(today, daysAhead);
  let cursor = new Date(`${recurring.next_due_date}T00:00:00`);
  let count = 0;
  while (cursor <= horizon) {
    if (cursor >= today) count += 1;
    cursor = addDays(cursor, stepDays);
  }
  return count;
}

export interface CashflowForecastPoint {
  daysAhead: number;
  projectedBalance: number;
}

// Proyección simplificada: saldo actual + tendencia histórica diaria (excluyendo categorías ya
// cubiertas por recurrentes, para no contarlas dos veces) + las próximas ocurrencias conocidas de
// cada recurrente activo. No sustituye una proyección contable real, es una guía de tendencia.
export function computeCashflowForecast(
  transactions: Transaction[],
  recurring: RecurringTransaction[],
  today: Date = new Date(),
  horizons: number[] = [30, 60, 90]
): CashflowForecastPoint[] {
  const currentBalance = cumulativeBalanceOf(transactions);
  const ctx = buildMonthContext(transactions, today);
  const activeRecurring = recurring.filter((r) => r.active);
  const recurringCategoryIds = new Set(activeRecurring.map((r) => r.category_id).filter((id): id is string => !!id));

  const backgroundTx = ctx.pastMonthsTx.filter((t) => !t.category_id || !recurringCategoryIds.has(t.category_id));
  const avgDailyBackgroundNet = netOf(backgroundTx) / (ctx.pastMonthsCount * 30);

  return horizons.map((daysAhead) => {
    const recurringNet = activeRecurring.reduce((acc, r) => {
      const occurrences = recurringOccurrencesInWindow(r, today, daysAhead);
      const sign = r.type === 'ingreso' ? 1 : -1;
      return acc + sign * r.amount * occurrences;
    }, 0);
    const projectedBalance = currentBalance + avgDailyBackgroundNet * daysAhead + recurringNet;
    return { daysAhead, projectedBalance };
  });
}

// Metas cuyo ritmo de ahorro actual no alcanza para llegar a la fecha objetivo (o que ya la
// pasaron sin completarse). Compara el avance esperado (lineal desde la creación hasta la fecha
// objetivo) contra lo realmente ahorrado, con un margen de 30% antes de considerarlas "atrasadas".
export function computeGoalsOffTrack(goals: SavingsGoal[], today: Date = new Date()): SavingsGoal[] {
  return goals.filter((goal) => {
    if (!goal.target_date || goal.saved_amount >= goal.target_amount) return false;
    const targetDate = new Date(`${goal.target_date}T00:00:00`);
    if (today > targetDate) return true;
    const createdAt = new Date(goal.created_at);
    const totalDuration = targetDate.getTime() - createdAt.getTime();
    if (totalDuration <= 0) return false;
    const expectedFraction = Math.min(1, Math.max(0, (today.getTime() - createdAt.getTime()) / totalDuration));
    const expectedSaved = goal.target_amount * expectedFraction;
    return goal.saved_amount < expectedSaved * 0.7;
  });
}

export interface FixedVsVariable {
  fixed: number;
  variable: number;
}

// Fijo/variable se define directamente por categoría (Category.is_fixed, editable en
// Ajustes → Categorías) en vez de adivinarlo por si hay un recurrente activo: así el usuario
// decide, y no depende de haber configurado esa categoría como recurrente.
export function computeFixedVsVariable(ctx: MonthContext): FixedVsVariable {
  let fixed = 0;
  let variable = 0;
  for (const t of ctx.currentMonthTx) {
    if (t.type !== 'gasto') continue;
    if (t.category?.is_fixed) fixed += t.amount;
    else variable += t.amount;
  }
  return { fixed, variable };
}
