import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HealthScoreCard } from '@/components/HealthScoreCard';
import { getToneColors, ThemeColors } from '@/constants/theme';
import { useAuth } from '@/lib/AuthProvider';
import { Insight } from '@/lib/insights/generateInsights';
import { useFinancialHealth } from '@/lib/queries/useFinancialHealth';
import { useInsights } from '@/lib/queries/useInsights';
import { useColors } from '@/lib/ThemeProvider';
import { useWorkspace } from '@/lib/WorkspaceProvider';

function displayName(email: string | undefined) {
  if (!email) return null;
  const local = email.split('@')[0];
  if (!local) return null;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default function InsightsScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { session } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { insights, isLoading, isFetching, refetch } = useInsights(currentWorkspace?.id);
  const { health } = useFinancialHealth(currentWorkspace?.id);
  const name = displayName(session?.user.email);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
      >
        <Text style={styles.title}>Consejos</Text>
        <Text style={styles.subtitle}>
          Análisis automático de tus ingresos, gastos y ahorro en {currentWorkspace?.name ?? 'este workspace'}.
        </Text>

        {health && <HealthScoreCard health={health} />}

        <Pressable style={styles.chatButton} onPress={() => router.push('/(app)/chat')}>
          <MaterialCommunityIcons name="chat-question-outline" size={20} color="#fff" />
          <Text style={styles.chatButtonText}>Pregúntale algo a Kuenta</Text>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : insights.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="emoticon-happy-outline" size={28} color={colors.ingreso} />
            <Text style={styles.emptyText}>
              {name ? `${name}, vas` : 'Vas'} bien este mes: no detectamos sobregastos ni riesgos de caja con tus
              registros actuales.
            </Text>
          </View>
        ) : (
          insights.map((insight, index) => (
            <InsightCard key={insight.id} insight={insight} greeting={index === 0 ? name : null} />
          ))
        )}

        <Text style={styles.disclaimer}>
          Estos consejos se calculan localmente a partir de tus propios movimientos (no usan un modelo de IA externo
          todavía) y son solo una guía, no asesoría financiera profesional.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InsightCard({ insight, greeting }: { insight: Insight; greeting?: string | null }) {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const toneColors = useMemo(() => getToneColors(colors), [colors]);
  const tone = toneColors[insight.tone];
  return (
    <View style={[styles.card, { borderLeftColor: tone.fg }]}>
      <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
        <MaterialCommunityIcons name={insight.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={20} color={tone.fg} />
      </View>
      <Text style={styles.cardText}>
        {greeting ? <Text style={styles.greeting}>{greeting}, </Text> : null}
        {greeting ? insight.message.charAt(0).toLowerCase() + insight.message.slice(1) : insight.message}
      </Text>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    marginBottom: 4,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  greeting: {
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
});
