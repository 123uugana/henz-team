"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Camera, LogOut, User } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  getMe,
  logout,
  updateProfile,
  uploadImage,
  type AuthUser,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { resizeImage } from "@/lib/image";

export default function ProfilePage() {
  useAuthGuard();
  const router = useRouter();
  const { data: me, loading, error, setData } = useApi(getMe, "");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
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
      const updated = await updateProfile({
        name: `${lastName.trim()} ${firstName.trim()}`.trim(),
      });
      setData(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Хадгалж чадсангүй.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPhotoUploading(true);
    setPhotoError(null);

    try {
      const resized = await resizeImage(file, 512);
      const uploaded = await uploadImage(resized);
      const updated = await updateProfile({ imageUrl: uploaded.url });
      setData(updated);
    } catch (err) {
      setPhotoError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Зураг оруулж чадсангүй.",
      );
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await logout();
    } catch {
      // Local session is cleared in logout() even when the API is unavailable.
    } finally {
      router.replace("/phone");
      router.refresh();
    }
  };

  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" title="Профайл" />

      <div className="mt-6 flex flex-col items-center gap-2">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handlePhotoChange}
        />
        <button
          type="button"
          aria-label={
            me?.imageUrl ? "Профайл зураг солих" : "Профайл зураг нэмэх"
          }
          className="rounded-full outline-none ring-[#f2a93c] focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 dark:ring-offset-[#0d111b]"
          disabled={photoUploading || loading}
          onClick={() => photoInputRef.current?.click()}
        >
          <Avatar size="lg" className="size-24">
            {me?.imageUrl ? (
              <AvatarImage
                src={me.imageUrl}
                alt={`${me.name || "Хэрэглэгч"}-ийн зураг`}
              />
            ) : null}
            <AvatarFallback className="bg-amber-50 dark:bg-[#1c1408]">
              <User
                className="size-10 text-[#a85b0a]/70 dark:text-[#f2a93c]/70"
                strokeWidth={1.5}
              />
            </AvatarFallback>
            <AvatarBadge className="size-8 bg-[#f2a93c] text-[#1a1206]">
              <Camera className="size-4" />
            </AvatarBadge>
          </Avatar>
        </button>
        <button
          type="button"
          className="text-sm text-[#a85b0a]/90 hover:underline disabled:cursor-wait disabled:opacity-70 dark:text-[#f2a93c]/90"
          disabled={photoUploading || loading}
          onClick={() => photoInputRef.current?.click()}
        >
          {photoUploading
            ? "Зураг оруулж байна..."
            : me?.imageUrl
              ? "Зураг солих"
              : "Зураг нэмэх"}
        </button>
        {photoError ? (
          <p className="text-center text-sm text-red-600 dark:text-red-400">
            {photoError}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-10 text-center text-sm text-slate-500 dark:text-gray-400">
          Ачаалж байна...
        </p>
      ) : error ? (
        <p className="mt-10 text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label className="text-slate-700 dark:text-gray-300">
              Утасны дугаар
            </Label>
            <div className="flex h-14 items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c2c] px-4">
              <span className="text-base text-slate-900 dark:text-white">
                +976 {me?.phoneNumber}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                <BadgeCheck className="size-3.5" />
                Баталгаажсан
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="lastName"
              className="text-slate-700 dark:text-gray-300"
            >
              Овог
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Та овогоо оруулна уу..."
              className="h-14 border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c2c] px-4 py-0 text-base text-slate-900 dark:text-white placeholder:text-slate-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="firstName"
              className="text-slate-700 dark:text-gray-300"
            >
              Нэр
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Та нэрээ оруулна уу..."
              className="h-14 border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c2c] px-4 py-0 text-base text-slate-900 dark:text-white placeholder:text-slate-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
            />
          </div>

          {saveError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {saveError}
            </p>
          ) : null}
          {saved ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Хадгалагдлаа.
            </p>
          ) : null}
        </div>
      )}

      <Button
        variant="brand"
        size="xl"
        className="mt-8 w-full"
        disabled={saving || photoUploading || loading}
        onClick={handleSave}
      >
        {saving ? "Хадгалж байна..." : "Хадгалах"}
      </Button>

      <Button
        variant="destructive"
        size="xl"
        className="mt-3 w-full"
        disabled={loggingOut}
        onClick={handleLogout}
      >
        <LogOut />
        {loggingOut ? "Гарч байна..." : "Системээс гарах"}
      </Button>
    </PhoneFrame>
  );
}
