import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/AuthProvider';

export default function AppLayout() {
  const { session, initializing } = useAuth();

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
    </Stack>
  );
}
