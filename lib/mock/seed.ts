import { addDays, format, getDate, getDaysInMonth, startOfMonth, subMonths } from 'date-fns';

import { DEMO_USER_ID } from '@/lib/config';
import { Category, Debt, EntryType, Transaction, Workspace } from '@/types/database';

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export const CATEGORY_DEFS: [string, EntryType, string, string][] = [
  ['Salario', 'ingreso', 'cash', '#16a34a'],
  ['Ventas', 'ingreso', 'trending-up', '#16a34a'],
  ['Otros ingresos', 'ingreso', 'plus-circle', '#16a34a'],
  ['Comida', 'gasto', 'food', '#dc2626'],
  ['Transporte', 'gasto', 'car', '#dc2626'],
  ['Servicios', 'gasto', 'flash', '#dc2626'],
  ['Renta', 'gasto', 'home', '#dc2626'],
  ['Otros gastos', 'gasto', 'dots-horizontal', '#dc2626'],
  ['Ahorro general', 'ahorro', 'piggy-bank', '#2563eb'],
];

export function buildDefaultCategories(workspaceId: string): Category[] {
  return CATEGORY_DEFS.map(([name, type, icon, color]) => ({
    id: nextId(`cat-${workspaceId}`),
    workspace_id: workspaceId,
    name,
    type,
    icon,
    color,
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

export const seedDebts: Debt[] = [
  { id: 'debt-1', workspace_id: 'ws-personal', name: 'Tarjeta Visa', balance: 1850000, interest_rate: 42.5, created_at: new Date().toISOString() },
  { id: 'debt-2', workspace_id: 'ws-personal', name: 'Tarjeta Mastercard', balance: 920000, interest_rate: 28.9, created_at: new Date().toISOString() },
  { id: 'debt-3', workspace_id: 'ws-personal', name: 'Crédito de libre inversión', balance: 3200000, interest_rate: 19.4, created_at: new Date().toISOString() },
  { id: 'debt-4', workspace_id: 'ws-negocio', name: 'Tarjeta empresarial', balance: 4500000, interest_rate: 34.2, created_at: new Date().toISOString() },
  { id: 'debt-5', workspace_id: 'ws-negocio', name: 'Préstamo de capital de trabajo', balance: 12000000, interest_rate: 22.1, created_at: new Date().toISOString() },
];

export { nextId };
