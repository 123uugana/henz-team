import { Tabs } from "expo-router";
import { Bell, Home, PawPrint, Search, User } from "lucide-react-native";

import { colors } from "@/native/ui";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.border,
          height: 78,
          paddingBottom: 12,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Нүүр", tabBarIcon: ({ color }) => <Home color={color} /> }} />
      <Tabs.Screen name="animals" options={{ title: "Сүрэг", tabBarIcon: ({ color }) => <PawPrint color={color} /> }} />
      <Tabs.Screen name="missing" options={{ title: "Алга", tabBarIcon: ({ color }) => <Search color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ title: "Мэдээ", tabBarIcon: ({ color }) => <Bell color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Профайл", tabBarIcon: ({ color }) => <User color={color} /> }} />
    </Tabs>
  );
}
