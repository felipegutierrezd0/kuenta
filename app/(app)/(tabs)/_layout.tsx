import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/HapticTab';
import { useColors } from '@/lib/ThemeProvider';

export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Resumen',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Movimientos',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="format-list-bulleted" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reportes',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-bar" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Consejos',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="lightbulb-on-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Herramientas',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="toolbox-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
