import { formatCurrency } from '@/lib/format';
import {
  buildMonthContext,
  computeBudgetOverrun,
  computeCashRunway,
  computeCategoryOverrun,
  computeDebtPriority,
  computeDiscretionarySavings,
  computeGoalsOffTrack,
  computeInvestmentCapacity,
} from '@/lib/insights/metrics';
import { Budget, Debt, SavingsGoal, Transaction } from '@/types/database';

export type InsightTone = 'danger' | 'warning' | 'success' | 'info';

export interface Insight {
  id: string;
  tone: InsightTone;
  icon: string;
  message: string;
}

const MAX_RUNWAY_DAYS_TO_WARN = 90;

export function generateInsights(
  transactions: Transaction[],
  debts: Debt[],
  today: Date = new Date(),
  budgets: Budget[] = [],
  savingsGoals: SavingsGoal[] = []
): Insight[] {
  const insights: Insight[] = [];
  const ctx = buildMonthContext(transactions, today);

  // 1) Presupuesto definido por el usuario que se va a superar (más preciso que el promedio histórico).
  const budgetOverrun = computeBudgetOverrun(ctx, budgets);
  if (budgetOverrun) {
    insights.push({
      id: 'budget-overrun',
      tone: budgetOverrun.pct > 25 ? 'danger' : 'warning',
      icon: 'wallet-outline',
      message: `Al ritmo actual, vas a cerrar el mes ${Math.round(budgetOverrun.pct)}% por encima de tu presupuesto de ${budgetOverrun.categoryName.toLowerCase()} (${formatCurrency(budgetOverrun.limit)}).`,
    });
  }

  // 2) Categoría de gasto por encima de lo habitual (solo si no tiene presupuesto propio, para no duplicar la alerta).
  const overrun = computeCategoryOverrun(ctx);
  if (overrun && overrun.name !== budgetOverrun?.categoryName) {
    insights.push({
      id: 'category-overrun',
      tone: 'warning',
      icon: 'alert-circle',
      message: `Este mes vas ${Math.round(overrun.pct)}% por encima de tu gasto habitual en ${overrun.name.toLowerCase()}.`,
    });
  }

  // 2) Proyección de caja disponible.
  const { cumulativeBalance, dailyNet } = computeCashRunway(ctx, transactions);
  if (dailyNet < 0) {
    if (cumulativeBalance > 0) {
      const daysLeft = Math.round(cumulativeBalance / Math.abs(dailyNet));
      if (daysLeft <= MAX_RUNWAY_DAYS_TO_WARN) {
        insights.push({
          id: 'cash-runway',
          tone: 'danger',
          icon: 'trending-down',
          message: `Si mantienes este ritmo de gasto, tu caja disponible podría llegar a cero en unos ${daysLeft} días.`,
        });
      }
    } else {
      insights.push({
        id: 'cash-runway-negative',
        tone: 'danger',
        icon: 'trending-down',
        message: 'Ya estás gastando más de lo que ingresa este mes y tu caja disponible está en cero o en negativo. Es buen momento para frenar gastos no esenciales.',
      });
    }
  }

  // 3) Ahorro potencial sin tocar gastos esenciales.
  const potentialSavings = computeDiscretionarySavings(ctx);
  if (potentialSavings > 10) {
    insights.push({
      id: 'discretionary-savings',
      tone: 'success',
      icon: 'piggy-bank-outline',
      message: `Puedes ahorrar unos ${formatCurrency(potentialSavings)} este mes si recortas un 20% tus gastos no esenciales, sin tocar renta ni servicios.`,
    });
  }

  // 4) Prioridad de pago de deudas (método avalancha: primero la de mayor interés).
  const debtPriority = computeDebtPriority(debts);
  if (debtPriority?.second) {
    const { first, second } = debtPriority;
    insights.push({
      id: 'debt-priority',
      tone: 'info',
      icon: 'credit-card-outline',
      message: `Te conviene abonar primero a "${first.name}" (${first.interest_rate}% de interés anual) antes que a "${second.name}" (${second.interest_rate}%) — así pagas menos intereses en total.`,
    });
  } else if (debtPriority) {
    insights.push({
      id: 'debt-single',
      tone: 'info',
      icon: 'credit-card-outline',
      message: `Tu única deuda registrada, "${debtPriority.first.name}", tiene un interés de ${debtPriority.first.interest_rate}% anual. Págala lo antes posible para reducir lo que pagas en intereses.`,
    });
  }

  // 5) Capacidad de inversión, basada en el promedio de meses anteriores completos.
  const investable = computeInvestmentCapacity(ctx, transactions);
  if (investable != null) {
    insights.push({
      id: 'investment-capacity',
      tone: 'success',
      icon: 'chart-line',
      message: `Con tu flujo de caja promedio de los últimos meses, podrías destinar unos ${formatCurrency(investable)} a inversión sin afectar tu día a día.`,
    });
  }

  // 6) Metas de ahorro atrasadas respecto a su fecha objetivo.
  const offTrackGoals = computeGoalsOffTrack(savingsGoals, today);
  for (const goal of offTrackGoals) {
    insights.push({
      id: `goal-off-track-${goal.id}`,
      tone: 'warning',
      icon: 'flag-outline',
      message: `Tu meta "${goal.name}" va más lenta de lo necesario para llegar a tiempo. Llevas ${formatCurrency(goal.saved_amount)} de ${formatCurrency(goal.target_amount)}.`,
    });
  }

  return insights;
}
