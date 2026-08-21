import { useFocusEffect } from "expo-router";
import { MapPin } from "lucide-react-native";
import { useCallback } from "react";
import { Text, View } from "react-native";

import { getMissingLivestock } from "@/native/api";
import { useApi } from "@/native/use-api";
import { Card, colors, formatDate, Header, Row, Screen, speciesLabel, StatusMessage } from "@/native/ui";

export default function MissingScreen() {
  const { data, loading, error, refresh } = useApi(getMissingLivestock, "missing");

  useFocusEffect(useCallback(() => refresh(), [refresh]));

  return (
    <Screen>
      <Header title="Алга болсон" subtitle="Сүүлийн бүртгэлээр хашаанд ороогүй мал." />
      <StatusMessage
        loading={loading}
        error={error}
        empty={data?.length === 0 ? "Алга болсон мал алга байна." : undefined}
      />

      {data?.map((animal) => (
        <Card key={animal.id} tone="accent">
          <Row>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>
                {animal.name || animal.earNumber}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                #{animal.earNumber} · {speciesLabel[animal.species]}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                Сүүлд харагдсан: {formatDate(animal.lastSeenAt)}
              </Text>
            </View>
            <MapPin color={colors.accent} size={22} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
