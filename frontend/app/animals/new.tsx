import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ApiError, createLivestock, Gender, Species } from "@/native/api";
import { colors, Field, Header, Label, PrimaryButton, Screen, styles } from "@/native/ui";

const speciesOptions: Array<{ label: string; value: Species }> = [
  { label: "Хонь", value: "SHEEP" },
  { label: "Ямаа", value: "GOAT" },
];

const genderOptions: Array<{ label: string; value: Gender }> = [
  { label: "Эр", value: "MALE" },
  { label: "Эм", value: "FEMALE" },
  { label: "Тодорхойгүй", value: "UNKNOWN" },
];

export default function NewAnimalScreen() {
  const [earNumber, setEarNumber] = useState("");
  const [name, setName] = useState("");
  const [rfidEpc, setRfidEpc] = useState("");
  const [species, setSpecies] = useState<Species>("SHEEP");
  const [gender, setGender] = useState<Gender>("UNKNOWN");
  const [birthYear, setBirthYear] = useState("");
  const [markDescription, setMarkDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!earNumber.trim()) {
      setError("Малын дугаар оруулна уу.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createLivestock({
        birthYear: birthYear ? Number(birthYear) : undefined,
        earNumber: earNumber.trim(),
        gender,
        markDescription: markDescription.trim() || undefined,
        name: name.trim() || undefined,
        rfidEpc: rfidEpc.trim() || undefined,
        species,
      });
      router.replace("/animals");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Бүртгэж чадсангүй.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Header title="Мал бүртгэх" subtitle="RFID, дугаар болон үндсэн мэдээллийг оруулна уу." />

      <View style={{ gap: 10 }}>
        <Label>Малын дугаар</Label>
        <Field onChangeText={setEarNumber} placeholder="A-001" value={earNumber} />
      </View>

      <View style={{ gap: 10 }}>
        <Label>RFID EPC</Label>
        <Field autoCapitalize="characters" onChangeText={setRfidEpc} placeholder="EPC код" value={rfidEpc} />
      </View>

      <View style={{ gap: 10 }}>
        <Label>Нэр</Label>
        <Field onChangeText={setName} placeholder="Хоч нэр" value={name} />
      </View>

      <View style={{ gap: 10 }}>
        <Label>Төрөл</Label>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {speciesOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setSpecies(option.value)}
              style={[styles.pill, species === option.value && { backgroundColor: "rgba(242,169,60,0.18)" }]}
            >
              <Text style={[styles.pillText, species === option.value && { color: colors.accent }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Label>Хүйс</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {genderOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setGender(option.value)}
              style={[styles.pill, gender === option.value && { backgroundColor: "rgba(242,169,60,0.18)" }]}
            >
              <Text style={[styles.pillText, gender === option.value && { color: colors.accent }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Label>Төрсөн он</Label>
        <Field keyboardType="number-pad" onChangeText={setBirthYear} placeholder="2024" value={birthYear} />
      </View>

      <View style={{ gap: 10 }}>
        <Label>Онцлог шинж</Label>
        <Field multiline onChangeText={setMarkDescription} placeholder="Өнгө, тэмдэг..." value={markDescription} />
      </View>

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

      <PrimaryButton disabled={loading} onPress={submit}>
        {loading ? "Бүртгэж байна..." : "Бүртгэх"}
      </PrimaryButton>
      <PrimaryButton variant="outline" onPress={() => router.back()}>
        Буцах
      </PrimaryButton>
    </Screen>
  );
}
