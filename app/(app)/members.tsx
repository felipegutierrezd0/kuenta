import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/lib/AuthProvider';
import {
  useAcceptInvite,
  useInviteMember,
  usePendingInvites,
  useWorkspaceMembers,
} from '@/lib/queries/useWorkspaceMembers';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';

const ROLE_LABELS: Record<string, string> = { owner: 'Propietario', admin: 'Admin', member: 'Miembro' };

export default function MembersScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { session } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const membersQuery = useWorkspaceMembers(currentWorkspace?.id);
  const pendingInvitesQuery = usePendingInvites(session?.user.email);
  const inviteMember = useInviteMember(currentWorkspace?.id);
  const acceptInvite = useAcceptInvite();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');

  const myMembership = (membersQuery.data ?? []).find((m) => m.user_id === session?.user.id);
  const canInvite = myMembership?.role === 'owner' || myMembership?.role === 'admin';

  function handleInvite() {
    if (!email.trim()) return;
    inviteMember.mutate({ email: email.trim().toLowerCase(), role }, { onSuccess: () => setEmail('') });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Miembros</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {(pendingInvitesQuery.data ?? []).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Invitaciones pendientes</Text>
            {(pendingInvitesQuery.data ?? []).map((invite) => (
              <View key={invite.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{invite.workspace?.name ?? 'Workspace'}</Text>
                  <Text style={styles.rowMeta}>Te invitaron como {ROLE_LABELS[invite.role]}</Text>
                </View>
                <Pressable
                  style={styles.acceptButton}
                  onPress={() => acceptInvite.mutate(invite.id)}
                  disabled={acceptInvite.isPending}
                >
                  {acceptInvite.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.acceptButtonText}>Aceptar</Text>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Miembros de {currentWorkspace?.name}</Text>
          {(membersQuery.data ?? []).map((member) => (
            <View key={member.user_id} style={styles.row}>
              <MaterialCommunityIcons name="account-circle-outline" size={22} color={colors.textMuted} />
              <Text style={styles.rowName}>
                {member.user_id === session?.user.id ? 'Tú' : `Usuario ${member.user_id.slice(0, 8)}`}
              </Text>
              <Text style={styles.roleBadge}>{ROLE_LABELS[member.role] ?? member.role}</Text>
            </View>
          ))}

          {canInvite ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.subLabel}>Invitar por correo</Text>
              <TextInput
                style={[styles.input, { marginBottom: 8 }]}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <View style={styles.typeRow}>
                {(['member', 'admin'] as const).map((r) => (
                  <Pressable
                    key={r}
                    style={[styles.typeChip, role === r && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={[styles.typeChipText, role === r && styles.typeChipTextActive]}>{ROLE_LABELS[r]}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={[styles.saveButton, !email.trim() && styles.saveButtonDisabled]}
                onPress={handleInvite}
                disabled={!email.trim() || inviteMember.isPending}
              >
                {inviteMember.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Enviar invitación</Text>
                )}
              </Pressable>
            </>
          ) : null}

          <Text style={styles.hint}>
            En modo demo solo existe un usuario, así que las invitaciones quedan como una vista previa del flujo — no
            hay un segundo usuario real que las acepte.
          </Text>
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
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
    rowName: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
    rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    roleBadge: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      backgroundColor: colors.ahorroBg,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    acceptButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      minWidth: 84,
      alignItems: 'center',
    },
    acceptButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
    subLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8 },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
    },
    typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    typeChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeChipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    typeChipTextActive: { color: '#fff' },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    hint: { fontSize: 11, color: colors.textMuted, marginTop: 14, lineHeight: 16 },
  });
