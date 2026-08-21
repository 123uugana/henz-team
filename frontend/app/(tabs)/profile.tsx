import { router } from "expo-router";
import { LogOut, User } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { ApiError, getMe, updateProfile } from "@/native/api";
import { clearSession, getSession } from "@/native/session";
import { Card, colors, Field, Header, Label, PrimaryButton, Screen, StatusMessage } from "@/native/ui";

export default function ProfileScreen() {
  const [name, setName] = useState(getSession()?.user.name ?? "");
  const [phone, setPhone] = useState(getSession()?.user.phoneNumber ?? "");
  const [role, setRole] = useState(getSession()?.user.role ?? "FARMER");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMe()
      .then((user) => {
        setName(user.name);
        setPhone(user.phoneNumber);
        setRole(user.role);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Профайл авч чадсангүй."))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const user = await updateProfile(name);
      setName(user.name);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Хадгалж чадсангүй.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await clearSession();
    router.replace("/phone");
  }

  return (
    <Screen>
      <Header title="Профайл" subtitle="Хэрэглэгчийн мэдээлэл" />
      <StatusMessage loading={loading} error={error} />

      {!loading ? (
        <>
          <Card>
            <View style={{ alignItems: "center", gap: 12 }}>
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: "#1c1408",
                  borderRadius: 999,
                  height: 88,
                  justifyContent: "center",
                  width: 88,
                }}
              >
                <User color={colors.accent} size={42} />
              </View>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>{name || "Нэр оруулаагүй"}</Text>
              <Text style={{ color: colors.muted }}>+976 {phone} · {role}</Text>
            </View>
          </Card>

          <View style={{ gap: 10 }}>
            <Label>Нэр</Label>
            <Field onChangeText={setName} placeholder="Нэр" value={name} />
          </View>

          {saved ? <Text style={{ color: colors.success }}>Хадгалагдлаа.</Text> : null}

          <PrimaryButton disabled={saving} onPress={save}>
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </PrimaryButton>
          <PrimaryButton variant="danger" onPress={logout}>
            <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
              <LogOut color={colors.danger} size={18} />
              <Text style={{ color: colors.danger, fontSize: 16, fontWeight: "800" }}>Гарах</Text>
            </View>
          </PrimaryButton>
        </>
      ) : null}
    </Screen>
  );
}
