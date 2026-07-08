import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/lib/AuthProvider';
import { queryClient } from '@/lib/queryClient';
import { WorkspaceProvider } from '@/lib/WorkspaceProvider';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkspaceProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(app)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="dark" />
        </WorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
