import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useWorkspace } from '@/lib/WorkspaceProvider';

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, switchWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);

  if (!currentWorkspace) return null;

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <MaterialCommunityIcons
          name={currentWorkspace.type === 'negocio' ? 'store' : 'account'}
          size={18}
          color={currentWorkspace.type === 'negocio' ? colors.secondary : colors.primary}
        />
        <Text style={styles.triggerText}>{currentWorkspace.name}</Text>
        {workspaces.length > 1 && <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textMuted} />}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Cambiar workspace</Text>
            {workspaces.map((w) => (
              <Pressable
                key={w.id}
                style={styles.option}
                onPress={() => {
                  switchWorkspace(w.id);
                  setOpen(false);
                }}
              >
                <MaterialCommunityIcons
                  name={w.type === 'negocio' ? 'store' : 'account'}
                  size={20}
                  color={
                    w.id === currentWorkspace.id
                      ? w.type === 'negocio'
                        ? colors.secondary
                        : colors.primary
                      : colors.textMuted
                  }
                />
                <Text style={[styles.optionText, w.id === currentWorkspace.id && styles.optionTextActive]}>
                  {w.name}
                </Text>
                {w.id === currentWorkspace.id && (
                  <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  optionTextActive: {
    fontWeight: '700',
  },
});
