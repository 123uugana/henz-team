import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { ApiError, sendOtp } from "@/native/api";
import { colors, Field, Header, Label, PrimaryButton, Screen } from "@/native/ui";

export default function PhoneScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function submit() {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 8) {
      setError("Утасны дугаараа зөв оруулна уу.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await sendOtp(cleaned);
      setDevCode(result.code ?? null);
      router.push({ pathname: "/otp", params: { phone: cleaned, code: result.code ?? "" } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Код илгээж чадсангүй.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, gap: 28, justifyContent: "center", minHeight: 620 }}>
        <Header title="Хэнц Хурга" subtitle="Сүргээ утаснаасаа хянах native Expo app." />

        <View style={{ gap: 10 }}>
          <Label>Утасны дугаар</Label>
          <Field
            keyboardType="phone-pad"
            maxLength={8}
            onChangeText={setPhone}
            placeholder="99112233"
            value={phone}
          />
        </View>

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        {devCode ? <Text style={{ color: colors.muted }}>Тест код: {devCode}</Text> : null}

        <PrimaryButton disabled={loading} onPress={submit}>
          {loading ? "Илгээж байна..." : "Код авах"}
        </PrimaryButton>
      </View>
    </Screen>
  );
}
