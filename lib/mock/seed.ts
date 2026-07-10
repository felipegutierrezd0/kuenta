import { addDays, format, getDate, getDaysInMonth, startOfMonth, subDays, subMonths } from 'date-fns';

import { categoryColorForIndex } from '@/lib/categoryColor';
import { DEMO_USER_ID } from '@/lib/config';
import {
  Account,
  Budget,
  Category,
  EntryType,
  Receivable,
  RecurringTransaction,
  SavingsGoal,
  Transaction,
  Workspace,
} from '@/types/database';

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

// El color de cada categoría por defecto se calcula por su posición dentro de su tipo
// (ver lib/categoryColor.ts) para que nunca se repita en los gráficos de Reportes.
const typeIndexCounters: Record<EntryType, number> = { ingreso: 0, gasto: 0, ahorro: 0 };
function nextCategoryColor(type: EntryType): string {
  const color = categoryColorForIndex(typeIndexCounters[type]);
  typeIndexCounters[type] += 1;
  return color;
}

// Renta y Servicios arrancan marcadas como gasto fijo (caso típico); el usuario puede cambiarlo
// para cualquier categoría desde Ajustes → Categorías.
export const CATEGORY_DEFS: [string, EntryType, string, string, boolean][] = [
  ['Salario', 'ingreso', 'cash', nextCategoryColor('ingreso'), false],
  ['Ventas', 'ingreso', 'trending-up', nextCategoryColor('ingreso'), false],
  ['Otros ingresos', 'ingreso', 'plus-circle', nextCategoryColor('ingreso'), false],
  ['Comida', 'gasto', 'food', nextCategoryColor('gasto'), false],
  ['Transporte', 'gasto', 'car', nextCategoryColor('gasto'), false],
  ['Servicios', 'gasto', 'flash', nextCategoryColor('gasto'), true],
  ['Renta', 'gasto', 'home', nextCategoryColor('gasto'), true],
  ['Otros gastos', 'gasto', 'dots-horizontal', nextCategoryColor('gasto'), false],
  ['Ahorro general', 'ahorro', 'piggy-bank', nextCategoryColor('ahorro'), false],
];

export function buildDefaultCategories(workspaceId: string): Category[] {
  return CATEGORY_DEFS.map(([name, type, icon, color, isFixed]) => ({
    id: nextId(`cat-${workspaceId}`),
    workspace_id: workspaceId,
    name,
    type,
    icon,
    color,
    is_fixed: isFixed,
    created_at: new Date().toISOString(),
  }));
}

export const seedWorkspaces: Workspace[] = [
  { id: 'ws-personal', name: 'Personal', type: 'personal', owner_id: DEMO_USER_ID, created_at: new Date().toISOString() },
  { id: 'ws-negocio', name: 'Mi Pyme', type: 'negocio', owner_id: DEMO_USER_ID, created_at: new Date().toISOString() },
];

export const seedCategories: Category[] = [
  ...buildDefaultCategories('ws-personal'),
  ...buildDefaultCategories('ws-negocio'),
];

function categoryFor(workspaceId: string, name: string) {
  return seedCategories.find((c) => c.workspace_id === workspaceId && c.name === name)!;
}

function buildTransactions(workspaceId: string, monthsBack: number, scale: number, incomeShock = 1): Transaction[] {
  const txs: Transaction[] = [];
  const today = new Date();

  const push = (date: Date, name: string, type: EntryType, amount: number, note?: string) => {
    if (amount <= 0) return;
    const category = categoryFor(workspaceId, name);
    txs.push({
      id: nextId(`tx-${workspaceId}`),
      workspace_id: workspaceId,
      user_id: DEMO_USER_ID,
      category_id: category.id,
      category,
      account_id: null,
      receipt_url: null,
      type,
      amount: Math.round(amount * scale),
      note: note ?? null,
      occurred_on: format(date, 'yyyy-MM-dd'),
      created_at: new Date().toISOString(),
    });
  };

  // Meses completos anteriores: patrón estable, sirve de referencia ("presupuesto habitual").
  for (let m = monthsBack; m >= 1; m--) {
    const monthStart = startOfMonth(subMonths(today, m));
    const variance = 1 + ((m % 3) - 1) * 0.06;
    push(addDays(monthStart, 0), 'Salario', 'ingreso', 1500 * variance);
    push(addDays(monthStart, 14), 'Ventas', 'ingreso', 300 * variance, 'Venta extra');
    push(addDays(monthStart, 2), 'Renta', 'gasto', 450);
    push(addDays(monthStart, 4), 'Comida', 'gasto', 170 * variance, 'Supermercado');
    push(addDays(monthStart, 18), 'Comida', 'gasto', 55 * variance, 'Restaurante');
    push(addDays(monthStart, 6), 'Transporte', 'gasto', 90 * variance);
    push(addDays(monthStart, 11), 'Servicios', 'gasto', 120 * variance, 'Luz y agua');
    push(addDays(monthStart, 22), 'Otros gastos', 'gasto', 50 * variance);
    push(addDays(monthStart, 26), 'Ahorro general', 'ahorro', 200 * variance);
  }

  // Mes en curso: solo lo que ya "pasó" (proporcional a los días transcurridos), con un
  // sobregasto deliberado en restaurantes para que los consejos de la pestaña Consejos
  // tengan algo real que señalar sin importar qué día del mes se abra la demo.
  const dayOfMonth = getDate(today);
  const daysInMonth = getDaysInMonth(today);
  const monthStart = startOfMonth(today);
  const elapsedFraction = dayOfMonth / daysInMonth;
  const clampDay = (d: number) => addDays(monthStart, Math.max(0, Math.min(dayOfMonth - 1, Math.round(d))));

  push(clampDay(0), 'Salario', 'ingreso', 1350 * incomeShock);
  if (dayOfMonth >= 14) push(clampDay(14), 'Ventas', 'ingreso', 150 * incomeShock, 'Venta extra');
  if (dayOfMonth >= 2) push(clampDay(2), 'Renta', 'gasto', 450);
  push(clampDay(1), 'Comida', 'gasto', 170 * elapsedFraction * 0.6, 'Supermercado');
  push(clampDay(Math.max(dayOfMonth - 9, 2)), 'Comida', 'gasto', 55 * elapsedFraction * 1.8, 'Restaurante');
  push(clampDay(Math.max(dayOfMonth - 3, 1)), 'Comida', 'gasto', 45 * elapsedFraction * 1.8, 'Restaurante');
  push(clampDay(3), 'Transporte', 'gasto', 90 * elapsedFraction);
  if (dayOfMonth >= 11) push(clampDay(11), 'Servicios', 'gasto', 120, 'Luz y agua');
  push(clampDay(Math.max(dayOfMonth - 1, 0)), 'Otros gastos', 'gasto', 50 * elapsedFraction, 'Imprevisto menor');
  push(clampDay(Math.max(dayOfMonth - 2, 0)), 'Ahorro general', 'ahorro', 200 * elapsedFraction * 0.4);

  return txs;
}

export const seedTransactions: Transaction[] = [
  ...buildTransactions('ws-personal', 6, 1),
  // Este mes las ventas del negocio bajaron (incomeShock < 1): sirve para mostrar la alerta
  // de flujo de caja en la pestaña Consejos, en contraste con el workspace Personal.
  ...buildTransactions('ws-negocio', 6, 4, 0.25),
];

export const seedAccounts: Account[] = [
  { id: 'acc-1', workspace_id: 'ws-personal', name: 'Cuenta principal', kind: 'banco', initial_balance: 500, created_at: new Date().toISOString() },
  { id: 'acc-2', workspace_id: 'ws-personal', name: 'Efectivo', kind: 'efectivo', initial_balance: 80, created_at: new Date().toISOString() },
  { id: 'acc-3', workspace_id: 'ws-negocio', name: 'Cuenta empresarial', kind: 'banco', initial_balance: 2500, created_at: new Date().toISOString() },
  { id: 'acc-4', workspace_id: 'ws-negocio', name: 'Caja', kind: 'efectivo', initial_balance: 300, created_at: new Date().toISOString() },
];

export const seedBudgets: Budget[] = [
  { id: 'budget-1', workspace_id: 'ws-personal', category_id: categoryFor('ws-personal', 'Comida').id, monthly_limit: 150, created_at: new Date().toISOString() },
  { id: 'budget-2', workspace_id: 'ws-personal', category_id: categoryFor('ws-personal', 'Transporte').id, monthly_limit: 100, created_at: new Date().toISOString() },
  { id: 'budget-3', workspace_id: 'ws-personal', category_id: categoryFor('ws-personal', 'Servicios').id, monthly_limit: 130, created_at: new Date().toISOString() },
  { id: 'budget-4', workspace_id: 'ws-negocio', category_id: categoryFor('ws-negocio', 'Comida').id, monthly_limit: 400, created_at: new Date().toISOString() },
  { id: 'budget-5', workspace_id: 'ws-negocio', category_id: categoryFor('ws-negocio', 'Servicios').id, monthly_limit: 500, created_at: new Date().toISOString() },
];

export const seedSavingsGoals: SavingsGoal[] = [
  {
    id: 'goal-1',
    workspace_id: 'ws-personal',
    name: 'Fondo de emergencia',
    target_amount: 3000,
    target_date: format(addDays(new Date(), 180), 'yyyy-MM-dd'),
    saved_amount: 1200,
    created_at: new Date().toISOString(),
  },
  {
    id: 'goal-2',
    workspace_id: 'ws-negocio',
    name: 'Comprar equipo nuevo',
    target_amount: 8000,
    target_date: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
    saved_amount: 2000,
    created_at: new Date().toISOString(),
  },
];

export const seedRecurringTransactions: RecurringTransaction[] = [
  {
    id: 'rec-1',
    workspace_id: 'ws-personal',
    category_id: categoryFor('ws-personal', 'Renta').id,
    category: categoryFor('ws-personal', 'Renta'),
    type: 'gasto',
    amount: 450,
    note: 'Renta mensual',
    frequency: 'mensual',
    next_due_date: format(new Date(), 'yyyy-MM-dd'),
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'rec-2',
    workspace_id: 'ws-personal',
    category_id: categoryFor('ws-personal', 'Salario').id,
    category: categoryFor('ws-personal', 'Salario'),
    type: 'ingreso',
    amount: 1350,
    note: 'Nómina',
    frequency: 'mensual',
    next_due_date: format(addDays(new Date(), 12), 'yyyy-MM-dd'),
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'rec-3',
    workspace_id: 'ws-negocio',
    category_id: categoryFor('ws-negocio', 'Renta').id,
    category: categoryFor('ws-negocio', 'Renta'),
    type: 'gasto',
    amount: 1800,
    note: 'Renta del local',
    frequency: 'mensual',
    next_due_date: format(new Date(), 'yyyy-MM-dd'),
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'rec-4',
    workspace_id: 'ws-negocio',
    category_id: categoryFor('ws-negocio', 'Otros gastos').id,
    category: categoryFor('ws-negocio', 'Otros gastos'),
    type: 'gasto',
    amount: 900,
    note: 'Nómina empleados',
    frequency: 'quincenal',
    next_due_date: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
    active: true,
    created_at: new Date().toISOString(),
  },
];

export const seedReceivables: Receivable[] = [
  {
    id: 'recv-1',
    workspace_id: 'ws-negocio',
    direction: 'cobrar',
    counterparty: 'Cliente ABC',
    amount: 2500,
    due_date: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
    status: 'pendiente',
    created_at: new Date().toISOString(),
  },
  {
    id: 'recv-2',
    workspace_id: 'ws-negocio',
    direction: 'cobrar',
    counterparty: 'Cliente XYZ',
    amount: 900,
    due_date: format(subDays(new Date(), 10), 'yyyy-MM-dd'),
    status: 'pendiente',
    created_at: new Date().toISOString(),
  },
  {
    id: 'recv-3',
    workspace_id: 'ws-negocio',
    direction: 'pagar',
    counterparty: 'Proveedor de insumos',
    amount: 1200,
    due_date: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
    status: 'pendiente',
    created_at: new Date().toISOString(),
  },
  {
    id: 'recv-4',
    workspace_id: 'ws-negocio',
    direction: 'pagar',
    counterparty: 'Contador',
    amount: 300,
    due_date: format(subDays(new Date(), 20), 'yyyy-MM-dd'),
    status: 'pagado',
    created_at: new Date().toISOString(),
  },
];

export { nextId };
