import { CloudOff, RefreshCw, Rss, UploadCloud, Wifi } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIGNAL_BARS = [1, 2, 3, 4, 5];
const SIGNAL_STRENGTH = 4;

export default function DeviceStatusPage() {
  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" />

      <div className="mt-6 flex flex-col gap-1">
        <h1 className="text-xl font-bold">Төхөөрөмжийн Төлөв</h1>
        <p className="text-sm text-gray-400">
          Сүлжээ болон уншигчийн мэдээлэл
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Card className="gap-4 bg-[#141a2c] p-4 ring-1 ring-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-full bg-white/5">
                <Wifi className="size-4 text-[#f2a93c]" strokeWidth={1.75} />
              </span>
              <div className="flex flex-col">
                <p className="text-sm font-semibold">Үндсэн Антен</p>
                <p className="text-xs text-gray-500">ID: ANT-6402</p>
              </div>
            </div>
            <Badge className="bg-emerald-400/15 text-emerald-400">
              Идэвхтэй
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Дохионы Хүч</p>
            <div className="flex items-end gap-1">
              {SIGNAL_BARS.map((bar) => (
                <span
                  key={bar}
                  style={{ height: `${bar * 4 + 6}px` }}
                  className={cn(
                    "w-1.5 rounded-full",
                    bar <= SIGNAL_STRENGTH ? "bg-[#f2a93c]" : "bg-white/10"
                  )}
                />
              ))}
            </div>
          </div>
        </Card>

        <Card className="gap-3 bg-[#141a2c] p-4 ring-1 ring-white/5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/5">
              <Rss className="size-4 text-[#f2a93c]" strokeWidth={1.75} />
            </span>
            <p className="text-sm font-semibold">Уншигчийн Цохилт</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 rounded-2xl bg-white/5 p-3">
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <RefreshCw className="size-3" />
                Сүүлийн Синхрон
              </span>
              <p className="text-sm font-semibold">2 мин өмнө</p>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl bg-white/5 p-3">
              <span className="text-xs text-gray-400">Цэнэг</span>
              <p className="text-sm font-semibold">54%</p>
            </div>
          </div>
        </Card>

        <Card className="gap-3 bg-red-500/10 p-4 ring-1 ring-red-500/20">
          <div className="flex items-center gap-2.5">
            <CloudOff className="size-4 text-red-400" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-red-400">
              Оффлайн Дараалал
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Холболт тасарсан үед хадгалагдсан бичлэгүүд
          </p>
          <p>
            <span className="text-3xl font-bold text-red-400">142</span>
            <span className="ml-2 text-sm text-gray-400">
              бичлэг хүлээгдэж байна
            </span>
          </p>
          <Button
            variant="outline"
            className="w-full border-red-500/30 bg-transparent text-red-400 hover:bg-red-500/10"
          >
            <UploadCloud />
            Апплоад хийхийг оролдох
          </Button>
        </Card>
      </div>

      <BottomNav />
    </PhoneFrame>
  );
}
