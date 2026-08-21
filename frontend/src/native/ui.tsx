import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const colors = {
  bg: "#070a12",
  panel: "#111827",
  card: "#141a2c",
  card2: "#161c2c",
  border: "rgba(255,255,255,0.08)",
  text: "#f8fafc",
  muted: "#94a3b8",
  accent: "#f2a93c",
  danger: "#f87171",
  success: "#34d399",
};

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  if (!scroll) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.fixed}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "accent" }) {
  return <View style={[styles.card, tone === "accent" && styles.accentCard]}>{children}</View>;
}

export function PrimaryButton({
  children,
  disabled,
  onPress,
  variant = "solid",
}: {
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  variant?: "solid" | "outline" | "danger";
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "outline" && styles.outlineButton,
        variant === "danger" && styles.dangerButton,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "outline" && styles.outlineButtonText,
          variant === "danger" && styles.dangerButtonText,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function Field(props: ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="#64748b"
      {...props}
      style={[styles.input, props.multiline && styles.textArea, props.style]}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

export function StatusMessage({
  loading,
  error,
  empty,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: string;
}) {
  if (loading) {
    return (
      <View style={styles.message}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.muted}>Ачаалж байна...</Text>
      </View>
    );
  }

  if (error) return <Text style={[styles.messageText, { color: colors.danger }]}>{error}</Text>;
  if (empty) return <Text style={styles.messageText}>{empty}</Text>;
  return null;
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "good" | "bad" }) {
  return (
    <View style={[styles.pill, tone === "good" && styles.goodPill, tone === "bad" && styles.badPill]}>
      <Text style={[styles.pillText, tone === "good" && styles.goodText, tone === "bad" && styles.badText]}>
        {children}
      </Text>
    </View>
  );
}

export function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("mn-MN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const speciesLabel = {
  SHEEP: "Хонь",
  GOAT: "Ямаа",
} as const;

export const statusLabel = {
  ACTIVE: "Идэвхтэй",
  MISSING: "Алга",
  INACTIVE: "Идэвхгүй",
} as const;

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  fixed: {
    flex: 1,
    padding: 20,
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 108,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  accentCard: {
    backgroundColor: "#1c1408",
    borderColor: "rgba(242,169,60,0.28)",
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 8,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderColor: "rgba(242,169,60,0.45)",
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: "rgba(248,113,113,0.12)",
    borderColor: "rgba(248,113,113,0.25)",
    borderWidth: 1,
  },
  buttonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
  },
  outlineButtonText: {
    color: colors.accent,
  },
  dangerButtonText: {
    color: colors.danger,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.84,
  },
  input: {
    backgroundColor: colors.card2,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  textArea: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  label: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "700",
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  message: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 30,
  },
  messageText: {
    color: colors.muted,
    fontSize: 14,
    paddingVertical: 26,
    textAlign: "center",
  },
  muted: {
    color: colors.muted,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(148,163,184,0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  goodPill: {
    backgroundColor: "rgba(52,211,153,0.12)",
  },
  badPill: {
    backgroundColor: "rgba(248,113,113,0.12)",
  },
  pillText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
  },
  goodText: {
    color: colors.success,
  },
  badText: {
    color: colors.danger,
  },
});
