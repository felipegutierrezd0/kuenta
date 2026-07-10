export type WorkspaceType = 'personal' | 'negocio';
export type EntryType = 'ingreso' | 'gasto' | 'ahorro';

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

export interface Category {
  id: string;
  workspace_id: string;
  name: string;
  type: EntryType;
  icon: string | null;
  color: string | null;
  is_fixed: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  workspace_id: string;
  user_id: string;
  category_id: string | null;
  account_id: string | null;
  type: EntryType;
  amount: number;
  note: string | null;
  occurred_on: string;
  created_at: string;
  receipt_url: string | null;
  category?: Category | null;
  account?: Account | null;
}

export interface MonthlySummary {
  ingresos: number;
  gastos: number;
  ahorro: number;
  balance: number;
}

export type AccountKind = 'efectivo' | 'banco' | 'tarjeta' | 'otro';

export interface Account {
  id: string;
  workspace_id: string;
  name: string;
  kind: AccountKind;
  initial_balance: number;
  created_at: string;
}

export interface Budget {
  id: string;
  workspace_id: string;
  category_id: string;
  monthly_limit: number;
  created_at: string;
  category?: Category | null;
}

export interface SavingsGoal {
  id: string;
  workspace_id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  saved_amount: number;
  created_at: string;
}

export type RecurringFrequency = 'semanal' | 'quincenal' | 'mensual';

export interface RecurringTransaction {
  id: string;
  workspace_id: string;
  category_id: string | null;
  type: EntryType;
  amount: number;
  note: string | null;
  frequency: RecurringFrequency;
  next_due_date: string;
  active: boolean;
  created_at: string;
  category?: Category | null;
}

export type ReceivableDirection = 'cobrar' | 'pagar';
export type ReceivableStatus = 'pendiente' | 'pagado';

export interface Receivable {
  id: string;
  workspace_id: string;
  direction: ReceivableDirection;
  counterparty: string;
  amount: number;
  due_date: string | null;
  status: ReceivableStatus;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  transaction_id: string;
  workspace_id: string;
  participant_name: string;
  share_amount: number;
  paid: boolean;
  created_at: string;
  transaction?: Transaction | null;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: 'admin' | 'member';
  created_at: string;
  workspace?: Workspace | null;
}
