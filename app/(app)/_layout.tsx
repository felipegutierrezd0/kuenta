import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/lib/AuthProvider';
import { useColors } from '@/lib/ThemeProvider';

export default function AppLayout() {
  const { session, initializing } = useAuth();
  const colors = useColors();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
      <Stack.Screen name="chat" options={{ presentation: 'modal' }} />
      <Stack.Screen name="accounts" />
      <Stack.Screen name="budgets" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="recurring" />
      <Stack.Screen name="receivables" />
      <Stack.Screen name="members" />
    </Stack>
  );
}
