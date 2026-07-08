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
  created_at: string;
}

export interface Transaction {
  id: string;
  workspace_id: string;
  user_id: string;
  category_id: string | null;
  type: EntryType;
  amount: number;
  note: string | null;
  occurred_on: string;
  created_at: string;
  category?: Category | null;
}

export interface MonthlySummary {
  ingresos: number;
  gastos: number;
  ahorro: number;
  balance: number;
}

export interface Debt {
  id: string;
  workspace_id: string;
  name: string;
  balance: number;
  interest_rate: number; // tasa anual en %, ej. 42.5
  created_at: string;
}
