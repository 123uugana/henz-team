import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { loadSession } from "@/native/session";
import { colors } from "@/native/ui";

export default function IndexScreen() {
  useEffect(() => {
    loadSession().then((session) => {
      router.replace(session ? "/dashboard" : "/phone");
    });
  }, []);

  return (
    <View style={{ alignItems: "center", backgroundColor: colors.bg, flex: 1, gap: 12, justifyContent: "center" }}>
      <ActivityIndicator color={colors.accent} />
      <Text style={{ color: colors.muted }}>Нээж байна...</Text>
    </View>
  );
}
