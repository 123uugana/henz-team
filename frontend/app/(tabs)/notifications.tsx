import { useFocusEffect } from "expo-router";
import { Bell, CheckCircle2, Info } from "lucide-react-native";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { listAlerts, readAllAlerts } from "@/native/api";
import { useApi } from "@/native/use-api";
import { Card, colors, formatDate, Header, Row, Screen, StatusMessage, styles } from "@/native/ui";

const iconByType = {
  MISSING: Bell,
  FOUND: CheckCircle2,
  SYSTEM: Info,
} as const;

export default function NotificationsScreen() {
  const { data, loading, error, refresh } = useApi(listAlerts, "alerts");

  useFocusEffect(useCallback(() => refresh(), [refresh]));

  async function markAllRead() {
    await readAllAlerts().catch(() => null);
    refresh();
  }

  return (
    <Screen>
      <Header
        title="Мэдэгдэл"
        subtitle={`${data?.filter((item) => !item.isRead).length ?? 0} шинэ`}
        right={
          <Pressable onPress={markAllRead} style={styles.pill}>
            <Text style={[styles.pillText, { color: colors.accent }]}>Бүгдийг унших</Text>
          </Pressable>
        }
      />
      <StatusMessage
        loading={loading}
        error={error}
        empty={data?.length === 0 ? "Мэдэгдэл алга байна." : undefined}
      />

      {data?.map((item) => {
        const Icon = iconByType[item.type];
        return (
          <Card key={item.id}>
            <Row>
              <View style={{ flexDirection: "row", flex: 1, gap: 12 }}>
                <Icon color={item.isRead ? colors.muted : colors.accent} size={22} />
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={{ color: colors.text, fontWeight: "800" }}>{item.title}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>{item.message}</Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{formatDate(item.createdAt)}</Text>
                </View>
              </View>
              {!item.isRead ? <View style={{ backgroundColor: colors.accent, borderRadius: 99, height: 8, width: 8 }} /> : null}
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
