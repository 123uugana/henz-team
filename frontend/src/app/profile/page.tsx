"use client";

import { useState } from "react";
import { BadgeCheck, Camera, User } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, getMe, updateProfile, type AuthUser } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuthGuard } from "@/lib/use-auth-guard";

export default function ProfilePage() {
  useAuthGuard();
  const { data: me, loading, error } = useApi(getMe, "");

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Hydrate the editable name fields once, the first time `me` loads,
  // following React's "adjust state during render" pattern instead of an
  // effect (see https://react.dev/learn/you-might-not-need-an-effect).
  const [hydratedFor, setHydratedFor] = useState<AuthUser | null>(null);
  if (me && me !== hydratedFor) {
    setHydratedFor(me);
    const [first, ...rest] = me.name.split(" ").filter(Boolean);
    setLastName(first ?? "");
    setFirstName(rest.join(" "));
  }

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    try {
      await updateProfile(`${lastName.trim()} ${firstName.trim()}`.trim());
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Хадгалж чадсангүй.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" title="Профайл" />

      <div className="mt-6 flex flex-col items-center gap-2">
        <Avatar size="lg" className="size-24">
          <AvatarFallback className="bg-[#1c1408]">
            <User className="size-10 text-[#f2a93c]/70" strokeWidth={1.5} />
          </AvatarFallback>
          <AvatarBadge className="size-8 bg-[#f2a93c] text-[#1a1206]">
            <Camera className="size-4" />
          </AvatarBadge>
        </Avatar>
        <button className="text-sm text-[#f2a93c]/90 hover:underline">
          Зураг нэмэх
        </button>
      </div>

      {loading ? (
        <p className="mt-10 text-center text-sm text-gray-500">Ачаалж байна...</p>
      ) : error ? (
        <p className="mt-10 text-center text-sm text-red-400">{error}</p>
      ) : (
        <div className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label className="text-gray-300">Утасны дугаар</Label>
            <div className="flex h-14 items-center justify-between rounded-2xl border border-white/10 bg-[#161c2c] px-4">
              <span className="text-base text-white">+976 {me?.phoneNumber}</span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                <BadgeCheck className="size-3.5" />
                Баталгаажсан
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="lastName" className="text-gray-300">
              Овог
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Та овогоо оруулна уу..."
              className="h-14 border-white/10 bg-[#161c2c] px-4 py-0 text-base text-white placeholder:text-gray-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="firstName" className="text-gray-300">
              Нэр
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Та нэрээ оруулна уу..."
              className="h-14 border-white/10 bg-[#161c2c] px-4 py-0 text-base text-white placeholder:text-gray-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
            />
          </div>

          {saveError ? <p className="text-sm text-red-400">{saveError}</p> : null}
          {saved ? <p className="text-sm text-emerald-400">Хадгалагдлаа.</p> : null}
        </div>
      )}

      <Button
        variant="brand"
        size="xl"
        className="mt-8 w-full"
        disabled={saving || loading}
        onClick={handleSave}
      >
        {saving ? "Хадгалж байна..." : "Хадгалах"}
      </Button>
    </PhoneFrame>
  );
}
