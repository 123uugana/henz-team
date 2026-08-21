import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { ApiError, verifyOtp } from "@/native/api";
import { saveSession } from "@/native/session";
import { colors, Field, Header, Label, PrimaryButton, Screen } from "@/native/ui";

export default function OtpScreen() {
  const params = useLocalSearchParams<{ phone?: string; code?: string }>();
  const phone = String(params.phone ?? "");
  const [code, setCode] = useState(String(params.code ?? ""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (code.length < 4) {
      setError("Баталгаажуулах кодоо оруулна уу.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await verifyOtp(phone, code);
      await saveSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Код буруу байна.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, gap: 24, justifyContent: "center", minHeight: 620 }}>
        <Header title="Код оруулах" subtitle={`+976 ${phone} дугаарт илгээсэн кодыг оруулна уу.`} />

        <View style={{ gap: 10 }}>
          <Label>Баталгаажуулах код</Label>
          <Field
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setCode}
            placeholder="123456"
            value={code}
          />
        </View>

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        <PrimaryButton disabled={loading} onPress={submit}>
          {loading ? "Шалгаж байна..." : "Нэвтрэх"}
        </PrimaryButton>
        <PrimaryButton variant="outline" onPress={() => router.back()}>
          Буцах
        </PrimaryButton>
      </View>
    </Screen>
  );
}
