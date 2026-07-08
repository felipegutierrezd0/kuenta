import { DEMO_USER_ID } from '@/lib/config';
import { buildDefaultCategories, nextId, seedCategories, seedDebts, seedTransactions, seedWorkspaces } from '@/lib/mock/seed';
import { Category, Debt, EntryType, Transaction, Workspace, WorkspaceType } from '@/types/database';

let workspaces = [...seedWorkspaces];
let categories = [...seedCategories];
let transactions = [...seedTransactions];
let debts = [...seedDebts];

interface NewTransactionInput {
  workspaceId: string;
  type: EntryType;
  amount: number;
  categoryId: string | null;
  note: string | null;
  occurredOn: string;
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
    return workspace.id;
  },

  getCategories(workspaceId: string, type?: EntryType): Category[] {
    return categories
      .filter((c) => c.workspace_id === workspaceId && (!type || c.type === type))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  addCategory(workspaceId: string, name: string, type: EntryType): Category {
    const color = type === 'ingreso' ? '#16a34a' : type === 'gasto' ? '#dc2626' : '#2563eb';
    const category: Category = {
      id: nextId(`cat-${workspaceId}`),
      workspace_id: workspaceId,
      name,
      type,
      icon: 'shape',
      color,
      created_at: new Date().toISOString(),
    };
    categories = [...categories, category];
    return category;
  },

  deleteCategory(categoryId: string) {
    categories = categories.filter((c) => c.id !== categoryId);
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

  addTransaction(input: NewTransactionInput) {
    const category = categories.find((c) => c.id === input.categoryId) ?? null;
    const transaction: Transaction = {
      id: nextId(`tx-${input.workspaceId}`),
      workspace_id: input.workspaceId,
      user_id: DEMO_USER_ID,
      category_id: input.categoryId,
      category,
      type: input.type,
      amount: input.amount,
      note: input.note,
      occurred_on: input.occurredOn,
      created_at: new Date().toISOString(),
    };
    transactions = [...transactions, transaction];
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
};
