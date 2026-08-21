import { router, useFocusEffect } from "expo-router";
import { Plus, Search } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { listLivestock } from "@/native/api";
import { useApi } from "@/native/use-api";
import { Card, colors, Field, Header, Pill, Row, Screen, speciesLabel, StatusMessage, statusLabel, styles } from "@/native/ui";

export default function AnimalsScreen() {
  const [search, setSearch] = useState("");
  const { data, loading, error, refresh } = useApi(
    () => listLivestock({ search, page: 1, limit: 50 }),
    `animals:${search}`
  );

  useFocusEffect(useCallback(() => refresh(), [refresh]));

  return (
    <Screen>
      <Header
        title="Сүрэг"
        subtitle={`${data?.total ?? 0} бүртгэл`}
        right={
          <Pressable onPress={() => router.push("/animals/new")} style={{ padding: 8 }}>
            <Plus color={colors.accent} size={24} />
          </Pressable>
        }
      />

      <View style={{ gap: 10 }}>
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700" }}>Хайх</Text>
        <View style={{ position: "relative" }}>
          <Field onChangeText={setSearch} placeholder="Нэр, дугаар..." style={{ paddingLeft: 42 }} value={search} />
          <Search color={colors.accent} size={18} style={{ left: 14, position: "absolute", top: 17 }} />
        </View>
      </View>

      <StatusMessage loading={loading} error={error} empty={data?.items.length === 0 ? "Мал бүртгэл алга." : undefined} />

      {data?.items.map((animal) => (
        <Card key={animal.id}>
          <Row>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>
                {animal.name || animal.earNumber}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                #{animal.earNumber} · {speciesLabel[animal.species]} · {animal.rfidTag?.epc ?? "RFID алга"}
              </Text>
            </View>
            <Pill tone={animal.status === "MISSING" ? "bad" : "good"}>{statusLabel[animal.status]}</Pill>
          </Row>
        </Card>
      ))}

      <Pressable onPress={() => router.push("/animals/new")} style={styles.button}>
        <Text style={styles.buttonText}>Шинэ мал бүртгэх</Text>
      </Pressable>
    </Screen>
  );
}
