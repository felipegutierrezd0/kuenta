import { buildMonthContext, categoryTotals, netOf, sumByType } from '@/lib/insights/metrics';
import { SavingsGoal, Transaction } from '@/types/database';

export interface CategoryReduction {
  categoryId: string;
  categoryName: string;
  pct: number; // 0-100
}

export interface WhatIfInput {
  reductions: CategoryReduction[];
  extraMonthlyExpense: number;
  extraMonthlyIncome: number;
}

export interface WhatIfResult {
  baselineMonthlyIncome: number;
  baselineMonthlyExpense: number;
  baselineMonthlyNet: number;
  projectedMonthlyIncome: number;
  projectedMonthlyExpense: number;
  projectedMonthlyNet: number;
  monthlyDelta: number;
  annualDelta: number;
  reductionAmounts: { categoryName: string; amount: number }[];
}

// Promedio mensual histórico (excluyendo el mes en curso, que está incompleto) para cada
// categoría de gasto. Se usa como línea base "normal" antes de aplicar el escenario hipotético.
export function averageMonthlyExpenseByCategory(transactions: Transaction[], today: Date = new Date()) {
  const ctx = buildMonthContext(transactions, today);
  const totals = categoryTotals(ctx.pastMonthsTx, 'gasto');
  const averages = new Map<string, number>();
  for (const [name, total] of totals) averages.set(name, total / ctx.pastMonthsCount);
  return averages;
}

// Todo el cálculo se basa en promedios históricos mensuales (ingresos, gastos, ahorro) más los
// ajustes hipotéticos del escenario: reducir % de gasto en ciertas categorías, o sumar un gasto o
// ingreso mensual nuevo. Es una proyección orientativa, no una promesa exacta.
export function computeWhatIf(transactions: Transaction[], input: WhatIfInput, today: Date = new Date()): WhatIfResult {
  const ctx = buildMonthContext(transactions, today);
  const pastCount = ctx.pastMonthsCount;

  const baselineMonthlyIncome = sumByType(ctx.pastMonthsTx, 'ingreso') / pastCount;
  const baselineMonthlyExpenseRaw = sumByType(ctx.pastMonthsTx, 'gasto') / pastCount;
  const baselineMonthlySavings = sumByType(ctx.pastMonthsTx, 'ahorro') / pastCount;
  const baselineMonthlyNet = baselineMonthlyIncome - baselineMonthlyExpenseRaw - baselineMonthlySavings;

  const categoryAverages = averageMonthlyExpenseByCategory(transactions, today);
  const reductionAmounts = input.reductions.map((r) => {
    const avg = categoryAverages.get(r.categoryName) ?? 0;
    return { categoryName: r.categoryName, amount: avg * (r.pct / 100) };
  });
  const totalReduction = reductionAmounts.reduce((acc, r) => acc + r.amount, 0);

  const projectedMonthlyExpense = Math.max(0, baselineMonthlyExpenseRaw - totalReduction + input.extraMonthlyExpense);
  const projectedMonthlyIncome = baselineMonthlyIncome + input.extraMonthlyIncome;
  const projectedMonthlyNet = projectedMonthlyIncome - projectedMonthlyExpense - baselineMonthlySavings;

  const monthlyDelta = projectedMonthlyNet - baselineMonthlyNet;

  return {
    baselineMonthlyIncome,
    baselineMonthlyExpense: baselineMonthlyExpenseRaw,
    baselineMonthlyNet,
    projectedMonthlyIncome,
    projectedMonthlyExpense,
    projectedMonthlyNet,
    monthlyDelta,
    annualDelta: monthlyDelta * 12,
    reductionAmounts,
  };
}

export interface GoalProjection {
  goal: SavingsGoal;
  monthsBefore: number | null;
  monthsAfter: number | null;
}

// Estima cuántos meses faltan para completar una meta si todo el excedente mensual (neto,
// antes/después del escenario) se destinara a ahorrar para ella. `null` significa "al ritmo
// actual, nunca la alcanzarías" (excedente cero o negativo).
export function projectGoalCompletion(goal: SavingsGoal, netBefore: number, netAfter: number): GoalProjection {
  const remaining = Math.max(0, goal.target_amount - goal.saved_amount);
  const monthsBefore = netBefore > 0 ? remaining / netBefore : null;
  const monthsAfter = netAfter > 0 ? remaining / netAfter : null;
  return { goal, monthsBefore, monthsAfter };
}
