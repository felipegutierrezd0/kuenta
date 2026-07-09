import { addDays } from 'date-fns';

import { DEMO_USER_ID } from '@/lib/config';
import {
  buildDefaultCategories,
  nextId,
  seedAccounts,
  seedBudgets,
  seedCategories,
  seedDebts,
  seedReceivables,
  seedRecurringTransactions,
  seedSavingsGoals,
  seedTransactions,
  seedWorkspaces,
} from '@/lib/mock/seed';
import {
  Account,
  AccountKind,
  Budget,
  Category,
  Debt,
  EntryType,
  Receivable,
  ReceivableDirection,
  ReceivableStatus,
  RecurringFrequency,
  RecurringTransaction,
  SavingsGoal,
  Transaction,
  Workspace,
  WorkspaceInvite,
  WorkspaceMember,
  WorkspaceType,
} from '@/types/database';

let workspaces = [...seedWorkspaces];
let categories = [...seedCategories];
let transactions = [...seedTransactions];
let debts = [...seedDebts];
let accounts = [...seedAccounts];
let budgets = [...seedBudgets];
let savingsGoals = [...seedSavingsGoals];
let recurringTransactions = [...seedRecurringTransactions];
let receivables = [...seedReceivables];
let workspaceInvites: WorkspaceInvite[] = [];

const DEMO_MEMBERS: WorkspaceMember[] = seedWorkspaces.map((w) => ({
  workspace_id: w.id,
  user_id: DEMO_USER_ID,
  role: 'owner',
  created_at: w.created_at,
}));

interface NewTransactionInput {
  workspaceId: string;
  type: EntryType;
  amount: number;
  categoryId: string | null;
  accountId?: string | null;
  note: string | null;
  occurredOn: string;
}

function addMonthsToDate(date: Date, frequency: RecurringFrequency): Date {
  if (frequency === 'semanal') return addDays(date, 7);
  if (frequency === 'quincenal') return addDays(date, 15);
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

export const mockStore = {
  getWorkspaces(): Workspace[] {
    return workspaces;
  },

  createWorkspace(name: string, type: WorkspaceType): string {
    const workspace: Workspace = {
      id: nextId('ws'),
      name,
      type,
      owner_id: DEMO_USER_ID,
      created_at: new Date().toISOString(),
    };
    workspaces = [...workspaces, workspace];
    categories = [...categories, ...buildDefaultCategories(workspace.id)];
    DEMO_MEMBERS.push({ workspace_id: workspace.id, user_id: DEMO_USER_ID, role: 'owner', created_at: workspace.created_at });
    return workspace.id;
  },

  renameWorkspace(workspaceId: string, name: string) {
    workspaces = workspaces.map((w) => (w.id === workspaceId ? { ...w, name } : w));
  },

  getCategories(workspaceId: string, type?: EntryType): Category[] {
    return categories
      .filter((c) => c.workspace_id === workspaceId && (!type || c.type === type))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  addCategory(workspaceId: string, name: string, type: EntryType, color: string): Category {
    const category: Category = {
      id: nextId(`cat-${workspaceId}`),
      workspace_id: workspaceId,
      name,
      type,
      icon: 'shape',
      color,
      is_fixed: false,
      created_at: new Date().toISOString(),
    };
    categories = [...categories, category];
    return category;
  },

  deleteCategory(categoryId: string) {
    categories = categories.filter((c) => c.id !== categoryId);
  },

  setCategoryFixed(categoryId: string, isFixed: boolean) {
    categories = categories.map((c) => (c.id === categoryId ? { ...c, is_fixed: isFixed } : c));
  },

  getTransactionsInRange(workspaceId: string, monthStart: string, monthEnd: string, type?: EntryType): Transaction[] {
    return transactions
      .filter(
        (t) =>
          t.workspace_id === workspaceId &&
          t.occurred_on >= monthStart &&
          t.occurred_on <= monthEnd &&
          (!type || t.type === type)
      )
      .sort((a, b) => (b.occurred_on + b.created_at).localeCompare(a.occurred_on + a.created_at));
  },

  getAllTransactions(workspaceId: string): Transaction[] {
    return transactions
      .filter((t) => t.workspace_id === workspaceId)
      .sort((a, b) => (b.occurred_on + b.created_at).localeCompare(a.occurred_on + a.created_at));
  },

  addTransaction(input: NewTransactionInput): Transaction {
    const category = categories.find((c) => c.id === input.categoryId) ?? null;
    const account = accounts.find((a) => a.id === input.accountId) ?? null;
    const transaction: Transaction = {
      id: nextId(`tx-${input.workspaceId}`),
      workspace_id: input.workspaceId,
      user_id: DEMO_USER_ID,
      category_id: input.categoryId,
      category,
      account_id: input.accountId ?? null,
      account,
      type: input.type,
      amount: input.amount,
      note: input.note,
      occurred_on: input.occurredOn,
      created_at: new Date().toISOString(),
    };
    transactions = [...transactions, transaction];
    return transaction;
  },

  deleteTransaction(transactionId: string) {
    transactions = transactions.filter((t) => t.id !== transactionId);
  },

  getDebts(workspaceId: string): Debt[] {
    return debts
      .filter((d) => d.workspace_id === workspaceId)
      .sort((a, b) => b.interest_rate - a.interest_rate);
  },

  addDebt(workspaceId: string, name: string, balance: number, interestRate: number): Debt {
    const debt: Debt = {
      id: nextId(`debt-${workspaceId}`),
      workspace_id: workspaceId,
      name,
      balance,
      interest_rate: interestRate,
      created_at: new Date().toISOString(),
    };
    debts = [...debts, debt];
    return debt;
  },

  deleteDebt(debtId: string) {
    debts = debts.filter((d) => d.id !== debtId);
  },

  // --- Cuentas ---
  getAccounts(workspaceId: string): Account[] {
    return accounts.filter((a) => a.workspace_id === workspaceId).sort((a, b) => a.name.localeCompare(b.name));
  },

  addAccount(workspaceId: string, name: string, kind: AccountKind, initialBalance: number): Account {
    const account: Account = {
      id: nextId(`acc-${workspaceId}`),
      workspace_id: workspaceId,
      name,
      kind,
      initial_balance: initialBalance,
      created_at: new Date().toISOString(),
    };
    accounts = [...accounts, account];
    return account;
  },

  deleteAccount(accountId: string) {
    accounts = accounts.filter((a) => a.id !== accountId);
  },

  // --- Presupuestos ---
  getBudgets(workspaceId: string): Budget[] {
    return budgets
      .filter((b) => b.workspace_id === workspaceId)
      .map((b) => ({ ...b, category: categories.find((c) => c.id === b.category_id) ?? null }));
  },

  upsertBudget(workspaceId: string, categoryId: string, monthlyLimit: number): Budget {
    const existing = budgets.find((b) => b.workspace_id === workspaceId && b.category_id === categoryId);
    if (existing) {
      existing.monthly_limit = monthlyLimit;
      budgets = [...budgets];
      return existing;
    }
    const budget: Budget = {
      id: nextId(`budget-${workspaceId}`),
      workspace_id: workspaceId,
      category_id: categoryId,
      monthly_limit: monthlyLimit,
      created_at: new Date().toISOString(),
    };
    budgets = [...budgets, budget];
    return budget;
  },

  deleteBudget(budgetId: string) {
    budgets = budgets.filter((b) => b.id !== budgetId);
  },

  // --- Metas de ahorro ---
  getSavingsGoals(workspaceId: string): SavingsGoal[] {
    return savingsGoals.filter((g) => g.workspace_id === workspaceId);
  },

  addSavingsGoal(workspaceId: string, name: string, targetAmount: number, targetDate: string | null): SavingsGoal {
    const goal: SavingsGoal = {
      id: nextId(`goal-${workspaceId}`),
      workspace_id: workspaceId,
      name,
      target_amount: targetAmount,
      target_date: targetDate,
      saved_amount: 0,
      created_at: new Date().toISOString(),
    };
    savingsGoals = [...savingsGoals, goal];
    return goal;
  },

  contributeToGoal(goalId: string, amount: number) {
    savingsGoals = savingsGoals.map((g) => (g.id === goalId ? { ...g, saved_amount: g.saved_amount + amount } : g));
  },

  deleteSavingsGoal(goalId: string) {
    savingsGoals = savingsGoals.filter((g) => g.id !== goalId);
  },

  // --- Recurrentes ---
  getRecurringTransactions(workspaceId: string): RecurringTransaction[] {
    return recurringTransactions
      .filter((r) => r.workspace_id === workspaceId)
      .map((r) => ({ ...r, category: categories.find((c) => c.id === r.category_id) ?? null }))
      .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));
  },

  addRecurringTransaction(input: {
    workspaceId: string;
    type: EntryType;
    amount: number;
    categoryId: string | null;
    note: string | null;
    frequency: RecurringFrequency;
    nextDueDate: string;
  }): RecurringTransaction {
    const recurring: RecurringTransaction = {
      id: nextId(`rec-${input.workspaceId}`),
      workspace_id: input.workspaceId,
      category_id: input.categoryId,
      type: input.type,
      amount: input.amount,
      note: input.note,
      frequency: input.frequency,
      next_due_date: input.nextDueDate,
      active: true,
      created_at: new Date().toISOString(),
    };
    recurringTransactions = [...recurringTransactions, recurring];
    return recurring;
  },

  deleteRecurringTransaction(recurringId: string) {
    recurringTransactions = recurringTransactions.filter((r) => r.id !== recurringId);
  },

  registerRecurringOccurrence(recurringId: string): Transaction | null {
    const recurring = recurringTransactions.find((r) => r.id === recurringId);
    if (!recurring) return null;
    const transaction = mockStore.addTransaction({
      workspaceId: recurring.workspace_id,
      type: recurring.type,
      amount: recurring.amount,
      categoryId: recurring.category_id,
      note: recurring.note,
      occurredOn: recurring.next_due_date,
    });
    const nextDue = addMonthsToDate(new Date(`${recurring.next_due_date}T00:00:00`), recurring.frequency);
    recurringTransactions = recurringTransactions.map((r) =>
      r.id === recurringId ? { ...r, next_due_date: nextDue.toISOString().slice(0, 10) } : r
    );
    return transaction;
  },

  // --- Cuentas por cobrar/pagar ---
  getReceivables(workspaceId: string): Receivable[] {
    return receivables
      .filter((r) => r.workspace_id === workspaceId)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
  },

  addReceivable(input: {
    workspaceId: string;
    direction: ReceivableDirection;
    counterparty: string;
    amount: number;
    dueDate: string | null;
  }): Receivable {
    const receivable: Receivable = {
      id: nextId(`recv-${input.workspaceId}`),
      workspace_id: input.workspaceId,
      direction: input.direction,
      counterparty: input.counterparty,
      amount: input.amount,
      due_date: input.dueDate,
      status: 'pendiente',
      created_at: new Date().toISOString(),
    };
    receivables = [...receivables, receivable];
    return receivable;
  },

  updateReceivableStatus(receivableId: string, status: ReceivableStatus) {
    receivables = receivables.map((r) => (r.id === receivableId ? { ...r, status } : r));
  },

  deleteReceivable(receivableId: string) {
    receivables = receivables.filter((r) => r.id !== receivableId);
  },

  // --- Miembros e invitaciones (en modo demo solo hay un usuario real) ---
  getWorkspaceMembers(workspaceId: string): WorkspaceMember[] {
    return DEMO_MEMBERS.filter((m) => m.workspace_id === workspaceId);
  },

  getPendingInvites(_email: string): WorkspaceInvite[] {
    return workspaceInvites.map((i) => ({ ...i, workspace: workspaces.find((w) => w.id === i.workspace_id) ?? null }));
  },

  inviteMember(workspaceId: string, email: string, role: 'admin' | 'member'): WorkspaceInvite {
    const invite: WorkspaceInvite = {
      id: nextId(`invite-${workspaceId}`),
      workspace_id: workspaceId,
      email,
      role,
      created_at: new Date().toISOString(),
    };
    workspaceInvites = [...workspaceInvites, invite];
    return invite;
  },

  acceptInvite(inviteId: string) {
    const invite = workspaceInvites.find((i) => i.id === inviteId);
    if (!invite) return;
    DEMO_MEMBERS.push({ workspace_id: invite.workspace_id, user_id: DEMO_USER_ID, role: invite.role, created_at: new Date().toISOString() });
    workspaceInvites = workspaceInvites.filter((i) => i.id !== inviteId);
  },
};
