import { router, useFocusEffect } from "expo-router";
import { PawPrint, RefreshCcw, ScanLine, TriangleAlert } from "lucide-react-native";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { getDashboard } from "@/native/api";
import { useApi } from "@/native/use-api";
import { Card, colors, formatDate, Header, Pill, Row, Screen, Stat, StatusMessage, styles } from "@/native/ui";

export default function DashboardScreen() {
  const { data, loading, error, refresh } = useApi(getDashboard, "dashboard");

  useFocusEffect(useCallback(() => refresh(), [refresh]));

  return (
    <Screen>
      <Header
        title="Сүргийн самбар"
        subtitle="Өнөөдрийн RFID уншилт, алга болсон мал болон нийт бүртгэлийн тойм."
        right={
          <Pressable onPress={refresh} style={{ padding: 8 }}>
            <RefreshCcw color={colors.accent} size={22} />
          </Pressable>
        }
      />

      <StatusMessage loading={loading} error={error} />

      {data ? (
        <>
          <Card tone="accent">
            <Row>
              <View style={{ flex: 1, gap: 8 }}>
                <Row>
                  <TriangleAlert color={colors.accent} size={20} />
                  <Text style={{ color: colors.accent, flex: 1, fontWeight: "800" }}>Анхаарах мал</Text>
                </Row>
                <Text style={{ color: colors.text, fontSize: 38, fontWeight: "900" }}>{data.missingCount}</Text>
                <Text style={{ color: colors.muted }}>Алга гэж тэмдэглэгдсэн бүртгэл</Text>
              </View>
              <Pressable onPress={() => router.push("/missing")} style={styles.pill}>
                <Text style={[styles.pillText, { color: colors.accent }]}>Дэлгэрэнгүй</Text>
              </Pressable>
            </Row>
          </Card>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Stat label="Нийт мал" value={data.totalLivestock} />
            </View>
            <View style={{ flex: 1 }}>
              <Stat label="Өнөөдөр уншсан" value={data.scannedToday} />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Stat label="Хонь" value={data.sheepCount} />
            </View>
            <View style={{ flex: 1 }}>
              <Stat label="Ямаа" value={data.goatCount} />
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>Сүүлийн уншилтууд</Text>
            {data.recentScans.length === 0 ? (
              <StatusMessage empty="Уншилт хараахан алга." />
            ) : (
              data.recentScans.slice(0, 6).map((scan) => (
                <Card key={scan.id}>
                  <Row>
                    <View style={{ flexDirection: "row", flex: 1, gap: 12 }}>
                      <ScanLine color={colors.accent} size={20} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ color: colors.text, fontWeight: "800" }}>
                          {scan.livestock.name || scan.livestock.earNumber}
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>{formatDate(scan.scannedAt)}</Text>
                      </View>
                    </View>
                    <Pill tone={scan.direction === "ENTER" ? "good" : "default"}>{scan.direction}</Pill>
                  </Row>
                </Card>
              ))
            )}
          </View>
        </>
      ) : null}

      <Pressable onPress={() => router.push("/animals/new")} style={styles.button}>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
          <PawPrint color="#111827" size={18} />
          <Text style={styles.buttonText}>Мал бүртгэх</Text>
        </View>
      </Pressable>
    </Screen>
  );
}
