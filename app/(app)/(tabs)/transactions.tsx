import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { addMonths, format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TransactionListItem } from '@/components/TransactionListItem';
import { ThemeColors, typeLabels } from '@/constants/theme';
import { confirmDestructive } from '@/lib/alert';
import { monthRange } from '@/lib/dateRange';
import { useDeleteTransaction, useTransactions } from '@/lib/queries/useTransactions';
import { normalizeText } from '@/lib/text';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';
import { EntryType, Transaction } from '@/types/database';

const FILTERS: (EntryType | 'todos')[] = ['todos', 'ingreso', 'gasto', 'ahorro'];

export default function TransactionsScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { currentWorkspace } = useWorkspace();
  const [month, setMonth] = useState(new Date());
  const [filter, setFilter] = useState<EntryType | 'todos'>('todos');
  const [search, setSearch] = useState('');

  const { start, end } = useMemo(() => monthRange(month), [month]);
  const query = useTransactions({
    workspaceId: currentWorkspace?.id,
    monthStart: start,
    monthEnd: end,
    type: filter === 'todos' ? undefined : filter,
  });
  const deleteTransaction = useDeleteTransaction(currentWorkspace?.id);

  const filteredData = useMemo(() => {
    const data = query.data ?? [];
    const term = normalizeText(search.trim());
    if (!term) return data;
    return data.filter((t) => {
      const haystack = normalizeText(`${t.note ?? ''} ${t.category?.name ?? ''}`);
      return haystack.includes(term);
    });
  }, [query.data, search]);

  function confirmDelete(transaction: Transaction) {
    confirmDestructive('Eliminar movimiento', '¿Seguro que quieres eliminarlo?', 'Eliminar', () =>
      deleteTransaction.mutate(transaction.id)
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.monthNav}>
        <Pressable onPress={() => setMonth((m) => subMonths(m, 1))} hitSlop={12}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.monthLabel}>{format(month, 'MMMM yyyy', { locale: es })}</Text>
        <Pressable onPress={() => setMonth((m) => addMonths(m, 1))} hitSlop={12}>
          <MaterialCommunityIcons name="chevron-right" size={26} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'todos' ? 'Todos' : typeLabels[f]}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nota o categoría..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onLongPress={() => confirmDelete(item)}>
              <TransactionListItem transaction={item} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search ? 'No hay movimientos que coincidan con tu búsqueda.' : 'No hay movimientos en este mes.'}
            </Text>
          }
          refreshing={query.isFetching}
          onRefresh={() => query.refetch()}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'capitalize',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterTextActive: {
    color: '#fff',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 40,
  },
});
