import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { notify } from '@/lib/alert';
import { useAuth } from '@/lib/AuthProvider';
import { buildBackup, exportBackupJson, importBackup, pickBackupJson } from '@/lib/backup';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';
import { useQueryClient } from '@tanstack/react-query';

export default function BackupScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currentWorkspace } = useWorkspace();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleExport() {
    if (!currentWorkspace) return;
    setExporting(true);
    try {
      const backup = await buildBackup(currentWorkspace.id, currentWorkspace.name);
      await exportBackupJson(backup);
    } catch (e: any) {
      notify('Error', e.message ?? 'No se pudo exportar el respaldo.');
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    if (!currentWorkspace || !session?.user.id) return;
    setImporting(true);
    try {
      const backup = await pickBackupJson();
      if (!backup) return;
      const summary = await importBackup(currentWorkspace.id, backup, session.user.id);
      await queryClient.invalidateQueries();
      notify(
        'Respaldo importado',
        `Se importaron ${summary.categories} categorías, ${summary.accounts} cuentas, ${summary.transactions} movimientos y otros registros a "${currentWorkspace.name}". Las filas que ya existían se omitieron.`
      );
    } catch (e: any) {
      notify('Error', e.message ?? 'No se pudo importar el respaldo.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Respaldo</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Exportar respaldo</Text>
          <Text style={styles.cardHint}>
            Descarga un archivo .json con todas las categorías, cuentas, presupuestos, metas, recurrentes, cobros/pagos
            y movimientos del workspace "{currentWorkspace?.name}".
          </Text>
          <Pressable style={styles.button} onPress={handleExport} disabled={exporting}>
            {exporting ? <ActivityIndicator color="#fff" /> : (
              <>
                <MaterialCommunityIcons name="tray-arrow-down" size={18} color="#fff" />
                <Text style={styles.buttonText}>Exportar respaldo (JSON)</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Importar respaldo</Text>
          <Text style={styles.cardHint}>
            Elige un archivo .json exportado previamente y añade sus datos al workspace "{currentWorkspace?.name}".
            Si un registro ya existe, se omite (puedes importar el mismo archivo varias veces sin duplicar).
          </Text>
          <Pressable style={[styles.button, styles.buttonSecondary]} onPress={handleImport} disabled={importing}>
            {importing ? <ActivityIndicator color={colors.primary} /> : (
              <>
                <MaterialCommunityIcons name="tray-arrow-up" size={18} color={colors.primary} />
                <Text style={[styles.buttonText, { color: colors.primary }]}>Importar respaldo (JSON)</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    content: { padding: 16, gap: 16, paddingBottom: 40 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    cardHint: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
    },
    buttonSecondary: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  });
