import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  Camera,
  ChevronRight,
  Tags,
  User,
} from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
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

      <div className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label className="text-gray-300">Утасны дугаар</Label>
          <div className="flex h-14 items-center justify-between rounded-2xl border border-white/10 bg-[#161c2c] px-4">
            <span className="text-base text-white">+976 9912 3456</span>
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
            placeholder="Та нэрээ оруулна уу..."
            className="h-14 border-white/10 bg-[#161c2c] px-4 py-0 text-base text-white placeholder:text-gray-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-gray-200">Админ</h2>

        <Link href="/admin/tags">
          <Card className="flex-row items-center gap-3 bg-[#141a2c] p-3 ring-1 ring-white/5">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/5">
              <Tags className="size-4 text-[#f2a93c]" strokeWidth={1.75} />
            </span>
            <p className="flex-1 text-sm font-medium">Tag удирдлага</p>
            <ChevronRight className="size-4 text-gray-500" />
          </Card>
        </Link>

        <Link href="/admin/registrations">
          <Card className="flex-row items-center gap-3 bg-[#141a2c] p-3 ring-1 ring-white/5">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/5">
              <Building2 className="size-4 text-[#f2a93c]" strokeWidth={1.75} />
            </span>
            <p className="flex-1 text-sm font-medium">Байгууллагын хүсэлт</p>
            <ChevronRight className="size-4 text-gray-500" />
          </Card>
        </Link>
      </div>

      <Button variant="brand" size="xl" className="mt-8 w-full">
        Хадгалах
      </Button>
    </PhoneFrame>
  );
}
