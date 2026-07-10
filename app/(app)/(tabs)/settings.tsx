import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors, typeLabels } from '@/constants/theme';
import { useAuth } from '@/lib/AuthProvider';
import { confirmDestructive, notify } from '@/lib/alert';
import { exportTransactionsCsv } from '@/lib/export';
import {
  useAddCategory,
  useCategories,
  useDeleteCategory,
  useUpdateCategory,
  useUpdateCategoryFixed,
} from '@/lib/queries/useCategories';
import { useAllTransactions } from '@/lib/queries/useTransactions';
import { usePinLock } from '@/lib/PinLock';
import { useColors, useTheme, ThemeMode } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';
import { EntryType, WorkspaceType } from '@/types/database';

const ENTRY_TYPES: EntryType[] = ['ingreso', 'gasto', 'ahorro'];

const APPEARANCE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
];

function NavRow({
  icon,
  label,
  onPress,
  colors,
  styles,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  colors: ThemeColors;
  styles: ReturnType<typeof getStyles>;
}) {
  return (
    <Pressable style={styles.navRow} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      <Text style={styles.navRowLabel}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { signOut } = useAuth();
  const { workspaces, currentWorkspace, switchWorkspace, createWorkspace, renameWorkspace } = useWorkspace();
  const categoriesQuery = useCategories(currentWorkspace?.id);
  const addCategory = useAddCategory(currentWorkspace?.id);
  const deleteCategory = useDeleteCategory(currentWorkspace?.id);
  const updateCategoryFixed = useUpdateCategoryFixed(currentWorkspace?.id);
  const updateCategory = useUpdateCategory(currentWorkspace?.id);
  const { mode, setMode } = useTheme();
  const { hasPin, setPin, removePin } = usePinLock();
  const allTransactionsQuery = useAllTransactions(currentWorkspace?.id);
  const [exporting, setExporting] = useState(false);

  const [settingPin, setSettingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  async function handleSavePin() {
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('El PIN debe tener 4 dígitos.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('Los PIN no coinciden.');
      return;
    }
    await setPin(newPin);
    setSettingPin(false);
    setNewPin('');
    setConfirmPin('');
    setPinError(null);
  }

  function handleRemovePin() {
    confirmDestructive('Quitar PIN', '¿Quitar el bloqueo por PIN de Kuenta?', 'Quitar', () => removePin());
  }

  const isNegocio = currentWorkspace?.type === 'negocio';

  async function handleExport() {
    setExporting(true);
    try {
      await exportTransactionsCsv(allTransactionsQuery.data ?? []);
    } catch (e: any) {
      notify('Error', e.message ?? 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  }

  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceType, setNewWorkspaceType] = useState<WorkspaceType>('negocio');
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);

  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [draftWorkspaceName, setDraftWorkspaceName] = useState('');
  const [renamingWorkspace, setRenamingWorkspace] = useState(false);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [draftCategoryName, setDraftCategoryName] = useState('');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<EntryType>('gasto');

  async function handleCreateWorkspace() {
    if (!newWorkspaceName.trim()) return;
    setCreatingWorkspace(true);
    try {
      await createWorkspace(newWorkspaceName.trim(), newWorkspaceType);
      setNewWorkspaceName('');
    } catch (e: any) {
      notify('Error', e.message ?? 'No se pudo crear el workspace');
    } finally {
      setCreatingWorkspace(false);
    }
  }

  async function saveWorkspaceName(workspaceId: string) {
    if (!draftWorkspaceName.trim()) return;
    setRenamingWorkspace(true);
    try {
      await renameWorkspace(workspaceId, draftWorkspaceName.trim());
      setEditingWorkspaceId(null);
    } catch (e: any) {
      notify('Error', e.message ?? 'No se pudo renombrar el workspace');
    } finally {
      setRenamingWorkspace(false);
    }
  }

  function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    const existingCountOfType = (categoriesQuery.data ?? []).filter((c) => c.type === newCategoryType).length;
    addCategory.mutate(
      { name: newCategoryName.trim(), type: newCategoryType, existingCountOfType },
      { onSuccess: () => setNewCategoryName('') }
    );
  }

  function handleDeleteCategory(id: string, name: string) {
    confirmDestructive('Eliminar categoría', `¿Eliminar "${name}"?`, 'Eliminar', () => deleteCategory.mutate(id));
  }

  function handleSaveCategoryName(id: string) {
    if (!draftCategoryName.trim()) return;
    updateCategory.mutate(
      { categoryId: id, name: draftCategoryName.trim() },
      { onSuccess: () => setEditingCategoryId(null) }
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ajustes</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tus workspaces</Text>
          {workspaces.map((w) =>
            editingWorkspaceId === w.id ? (
              <View key={w.id} style={styles.workspaceEditRow}>
                <TextInput
                  style={styles.input}
                  value={draftWorkspaceName}
                  onChangeText={setDraftWorkspaceName}
                  placeholder="Nombre del workspace"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <Pressable
                  style={styles.iconButton}
                  onPress={() => saveWorkspaceName(w.id)}
                  disabled={!draftWorkspaceName.trim() || renamingWorkspace}
                >
                  <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                </Pressable>
                <Pressable style={styles.iconButton} onPress={() => setEditingWorkspaceId(null)}>
                  <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <View key={w.id} style={styles.workspaceRow}>
                <Pressable style={styles.workspaceRowMain} onPress={() => switchWorkspace(w.id)}>
                  <MaterialCommunityIcons
                    name={w.type === 'negocio' ? 'store' : 'account'}
                    size={20}
                    color={
                      w.id === currentWorkspace?.id
                        ? w.type === 'negocio'
                          ? colors.secondary
                          : colors.primary
                        : colors.textMuted
                    }
                  />
                  <Text style={styles.workspaceName}>{w.name}</Text>
                  {w.id === currentWorkspace?.id && (
                    <MaterialCommunityIcons
                      name="check"
                      size={18}
                      color={w.type === 'negocio' ? colors.secondary : colors.primary}
                    />
                  )}
                </Pressable>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => {
                    setEditingWorkspaceId(w.id);
                    setDraftWorkspaceName(w.name);
                  }}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textMuted} />
                </Pressable>
              </View>
            )
          )}

          <View style={styles.divider} />
          <Text style={styles.subLabel}>Crear nuevo workspace</Text>
          <View style={styles.typeRow}>
            {(['personal', 'negocio'] as WorkspaceType[]).map((t) => (
              <Pressable
                key={t}
                style={[
                  styles.typeChip,
                  newWorkspaceType === t && {
                    backgroundColor: t === 'negocio' ? colors.secondary : colors.primary,
                    borderColor: t === 'negocio' ? colors.secondary : colors.primary,
                  },
                ]}
                onPress={() => setNewWorkspaceType(t)}
              >
                <Text style={[styles.typeChipText, newWorkspaceType === t && styles.typeChipTextActive]}>
                  {t === 'personal' ? 'Personal' : 'Negocio'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.inlineForm}>
            <TextInput
              style={styles.input}
              placeholder="Nombre (ej. Mi Pyme)"
              placeholderTextColor={colors.textMuted}
              value={newWorkspaceName}
              onChangeText={setNewWorkspaceName}
            />
            <Pressable
              style={[styles.addButton, (!newWorkspaceName.trim() || creatingWorkspace) && styles.addButtonDisabled]}
              onPress={handleCreateWorkspace}
              disabled={!newWorkspaceName.trim() || creatingWorkspace}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Herramientas</Text>
          <NavRow icon="bank-outline" label="Cuentas" onPress={() => router.push('/(app)/accounts')} colors={colors} styles={styles} />
          <NavRow icon="wallet-outline" label="Presupuestos" onPress={() => router.push('/(app)/budgets')} colors={colors} styles={styles} />
          <NavRow icon="flag-outline" label="Metas de ahorro" onPress={() => router.push('/(app)/goals')} colors={colors} styles={styles} />
          <NavRow icon="calendar-sync-outline" label="Recurrentes" onPress={() => router.push('/(app)/recurring')} colors={colors} styles={styles} />
          {isNegocio && (
            <NavRow icon="handshake-outline" label="Cobros y pagos" onPress={() => router.push('/(app)/receivables')} colors={colors} styles={styles} />
          )}
          {isNegocio && (
            <NavRow icon="account-multiple-outline" label="Miembros" onPress={() => router.push('/(app)/members')} colors={colors} styles={styles} />
          )}

          <Pressable style={styles.navRow} onPress={handleExport} disabled={exporting}>
            <MaterialCommunityIcons name="file-export-outline" size={20} color={colors.primary} />
            <Text style={styles.navRowLabel}>Exportar movimientos (CSV)</Text>
            {exporting ? <ActivityIndicator size="small" color={colors.primary} /> : <View style={{ width: 20 }} />}
          </Pressable>
          <NavRow icon="backup-restore" label="Respaldo (exportar / importar)" onPress={() => router.push('/(app)/backup')} colors={colors} styles={styles} />
          <NavRow icon="chart-timeline-variant" label="Simulador '¿qué pasaría si?'" onPress={() => router.push('/(app)/whatif')} colors={colors} styles={styles} />
          <NavRow icon="account-multiple-outline" label="Gastos compartidos" onPress={() => router.push('/(app)/splits')} colors={colors} styles={styles} />
          <NavRow icon="file-chart-outline" label="Resumen anual para impuestos" onPress={() => router.push('/(app)/tax-summary')} colors={colors} styles={styles} />

          <View style={styles.divider} />
          <Text style={styles.subLabel}>Apariencia</Text>
          <View style={styles.typeRow}>
            {APPEARANCE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.typeChip, mode === opt.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setMode(opt.value)}
              >
                <Text style={[styles.typeChipText, mode === opt.value && styles.typeChipTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Seguridad</Text>
          {hasPin ? (
            <>
              <Text style={styles.cardHint}>Kuenta te pedirá tu PIN cada vez que abras la app.</Text>
              <View style={styles.typeRow}>
                <Pressable style={styles.typeChip} onPress={() => setSettingPin(true)}>
                  <Text style={styles.typeChipText}>Cambiar PIN</Text>
                </Pressable>
                <Pressable style={styles.typeChip} onPress={handleRemovePin}>
                  <Text style={[styles.typeChipText, { color: colors.gasto }]}>Quitar PIN</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Text style={styles.cardHint}>Protege Kuenta con un PIN de 4 dígitos para que solo tú puedas abrirla.</Text>
          )}

          {(!hasPin || settingPin) && (
            <>
              {!hasPin && (
                <Pressable
                  style={[styles.addButton, { alignSelf: 'flex-start', paddingHorizontal: 14, width: 'auto', marginBottom: 12 }]}
                  onPress={() => setSettingPin(true)}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Activar PIN</Text>
                </Pressable>
              )}
              {settingPin && (
                <View style={{ gap: 8 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Nuevo PIN (4 dígitos)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                    value={newPin}
                    onChangeText={setNewPin}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirma el PIN"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                    value={confirmPin}
                    onChangeText={setConfirmPin}
                  />
                  {pinError && <Text style={styles.error}>{pinError}</Text>}
                  <Pressable style={styles.saveButton} onPress={handleSavePin}>
                    <Text style={styles.saveButtonText}>Guardar PIN</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Categorías</Text>
          {ENTRY_TYPES.map((type) => {
            const items = (categoriesQuery.data ?? []).filter((c) => c.type === type);
            if (items.length === 0) return null;
            return (
              <View key={type} style={styles.categoryGroup}>
                <Text style={[styles.categoryGroupTitle, { color: colors[type] }]}>{typeLabels[type]}</Text>
                {items.map((cat) =>
                  editingCategoryId === cat.id ? (
                    <View key={cat.id} style={styles.categoryEditRow}>
                      <TextInput
                        style={styles.input}
                        value={draftCategoryName}
                        onChangeText={setDraftCategoryName}
                        placeholder="Nombre de la categoría"
                        placeholderTextColor={colors.textMuted}
                        autoFocus
                      />
                      <Pressable
                        style={styles.iconButton}
                        onPress={() => handleSaveCategoryName(cat.id)}
                        disabled={!draftCategoryName.trim() || updateCategory.isPending}
                      >
                        <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                      </Pressable>
                      <Pressable style={styles.iconButton} onPress={() => setEditingCategoryId(null)}>
                        <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  ) : (
                    <View key={cat.id} style={styles.categoryRow}>
                      <Text style={styles.categoryName}>{cat.name}</Text>
                      {cat.type === 'gasto' && (
                        <Pressable
                          style={[styles.fixedPill, cat.is_fixed && styles.fixedPillActive]}
                          onPress={() => updateCategoryFixed.mutate({ categoryId: cat.id, isFixed: !cat.is_fixed })}
                        >
                          <Text style={[styles.fixedPillText, cat.is_fixed && styles.fixedPillTextActive]}>
                            {cat.is_fixed ? 'Fijo' : 'Variable'}
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => { setEditingCategoryId(cat.id); setDraftCategoryName(cat.name); }}
                        hitSlop={10}
                      >
                        <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textMuted} />
                      </Pressable>
                      <Pressable onPress={() => handleDeleteCategory(cat.id, cat.name)} hitSlop={10}>
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  )
                )}
              </View>
            );
          })}

          <View style={styles.divider} />
          <Text style={styles.subLabel}>Agregar categoría</Text>
          <View style={styles.typeRow}>
            {ENTRY_TYPES.map((t) => (
              <Pressable
                key={t}
                style={[styles.typeChip, newCategoryType === t && { backgroundColor: colors[t], borderColor: colors[t] }]}
                onPress={() => setNewCategoryType(t)}
              >
                <Text style={[styles.typeChipText, newCategoryType === t && styles.typeChipTextActive]}>
                  {typeLabels[t]}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.inlineForm}>
            <TextInput
              style={styles.input}
              placeholder="Ej. Publicidad"
              placeholderTextColor={colors.textMuted}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <Pressable
              style={[styles.addButton, !newCategoryName.trim() && styles.addButtonDisabled]}
              onPress={handleAddCategory}
              disabled={!newCategoryName.trim()}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={signOut}>
          <MaterialCommunityIcons name="logout" size={18} color={colors.gasto} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  cardHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
    marginTop: -6,
  },
  workspaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  workspaceRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  workspaceEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspaceName: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  typeChipTextActive: {
    color: '#fff',
  },
  inlineForm: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  error: {
    color: colors.gasto,
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  categoryGroup: {
    marginBottom: 8,
  },
  categoryGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  categoryEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  fixedPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fixedPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  fixedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  fixedPillTextActive: {
    color: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  logoutText: {
    color: colors.gasto,
    fontSize: 15,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  navRowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
