import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { isDemoMode } from '@/lib/config';
import { mockStore } from '@/lib/mock/store';
import { supabase } from '@/lib/supabase';
import {
  Account,
  Budget,
  Category,
  Receivable,
  RecurringTransaction,
  SavingsGoal,
  Transaction,
} from '@/types/database';

const BACKUP_VERSION = 1;

export interface WorkspaceBackup {
  version: number;
  exportedAt: string;
  workspaceName: string;
  categories: Category[];
  accounts: Account[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  recurringTransactions: RecurringTransaction[];
  receivables: Receivable[];
  transactions: Transaction[];
}

// Quita los campos que `importBackup` va a remplazar (workspace_id, y en transacciones el
// user_id y los joins resueltos), para no confundirlos con datos "reales" de la tabla.
function stripJoins<T extends Record<string, any>>(row: T, keys: string[]): T {
  const clean = { ...row };
  for (const key of keys) delete (clean as any)[key];
  return clean;
}

export async function buildBackup(workspaceId: string, workspaceName: string): Promise<WorkspaceBackup> {
  if (isDemoMode) {
    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      workspaceName,
      categories: mockStore.getCategories(workspaceId),
      accounts: mockStore.getAccounts(workspaceId),
      budgets: mockStore.getBudgets(workspaceId).map((b) => stripJoins(b, ['category'])),
      savingsGoals: mockStore.getSavingsGoals(workspaceId),
      recurringTransactions: mockStore.getRecurringTransactions(workspaceId).map((r) => stripJoins(r, ['category'])),
      receivables: mockStore.getReceivables(workspaceId),
      transactions: mockStore.getAllTransactions(workspaceId).map((t) => stripJoins(t, ['category', 'account'])),
    };
  }

  const [categories, accounts, budgets, savingsGoals, recurringTransactions, receivables, transactions] =
    await Promise.all([
      supabase.from('categories').select('*').eq('workspace_id', workspaceId),
      supabase.from('accounts').select('*').eq('workspace_id', workspaceId),
      supabase.from('budgets').select('*').eq('workspace_id', workspaceId),
      supabase.from('savings_goals').select('*').eq('workspace_id', workspaceId),
      supabase.from('recurring_transactions').select('*').eq('workspace_id', workspaceId),
      supabase.from('receivables').select('*').eq('workspace_id', workspaceId),
      supabase.from('transactions').select('*').eq('workspace_id', workspaceId),
    ]);

  for (const result of [categories, accounts, budgets, savingsGoals, recurringTransactions, receivables, transactions]) {
    if (result.error) throw result.error;
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    workspaceName,
    categories: categories.data as Category[],
    accounts: accounts.data as Account[],
    budgets: budgets.data as Budget[],
    savingsGoals: savingsGoals.data as SavingsGoal[],
    recurringTransactions: recurringTransactions.data as RecurringTransaction[],
    receivables: receivables.data as Receivable[],
    transactions: transactions.data as Transaction[],
  };
}

export async function exportBackupJson(backup: WorkspaceBackup) {
  const json = JSON.stringify(backup, null, 2);
  const fileName = `kuenta-respaldo-${backup.exportedAt.slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Exportar respaldo' });
  }
}

// Deja elegir un archivo .json y lo parsea como WorkspaceBackup. Devuelve null si el usuario
// cancela, o lanza un error si el archivo no tiene la forma esperada.
export async function pickBackupJson(): Promise<WorkspaceBackup | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const text = Platform.OS === 'web' ? await (await fetch(asset.uri)).text() : await FileSystem.readAsStringAsync(asset.uri);

  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.transactions)) {
    throw new Error('El archivo no tiene el formato de un respaldo de Kuenta.');
  }
  return parsed as WorkspaceBackup;
}

interface ImportSummary {
  categories: number;
  accounts: number;
  budgets: number;
  savingsGoals: number;
  recurringTransactions: number;
  receivables: number;
  transactions: number;
}

// Importa un respaldo en el workspace de destino, conservando los ids originales de cada fila
// (así las referencias cruzadas como transactions.category_id siguen apuntando a lo correcto).
// Solo se remplazan workspace_id (al workspace destino) y transactions.user_id (al usuario actual).
// Si una fila ya existe (mismo id, por ejemplo al reimportar el mismo respaldo), se omite.
export async function importBackup(
  targetWorkspaceId: string,
  backup: WorkspaceBackup,
  userId: string
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    categories: 0,
    accounts: 0,
    budgets: 0,
    savingsGoals: 0,
    recurringTransactions: 0,
    receivables: 0,
    transactions: 0,
  };

  async function insertRows(table: string, rows: Record<string, any>[], remap: (row: Record<string, any>) => Record<string, any>) {
    let inserted = 0;
    for (const original of rows) {
      const row = remap(stripJoins(original, ['category', 'account']));
      if (isDemoMode) {
        const before = table;
        mockStore.importRow(before, row);
        inserted += 1;
        continue;
      }
      const { error } = await supabase.from(table).insert(row);
      if (error) {
        if (error.code === '23505') continue;
        throw error;
      }
      inserted += 1;
    }
    return inserted;
  }

  summary.categories = await insertRows('categories', backup.categories, (r) => ({ ...r, workspace_id: targetWorkspaceId }));
  summary.accounts = await insertRows('accounts', backup.accounts, (r) => ({ ...r, workspace_id: targetWorkspaceId }));
  summary.budgets = await insertRows('budgets', backup.budgets, (r) => ({ ...r, workspace_id: targetWorkspaceId }));
  summary.savingsGoals = await insertRows('savings_goals', backup.savingsGoals, (r) => ({ ...r, workspace_id: targetWorkspaceId }));
  summary.recurringTransactions = await insertRows('recurring_transactions', backup.recurringTransactions, (r) => ({
    ...r,
    workspace_id: targetWorkspaceId,
  }));
  summary.receivables = await insertRows('receivables', backup.receivables, (r) => ({ ...r, workspace_id: targetWorkspaceId }));
  summary.transactions = await insertRows('transactions', backup.transactions, (r) => ({
    ...r,
    workspace_id: targetWorkspaceId,
    user_id: userId,
  }));

  return summary;
}
