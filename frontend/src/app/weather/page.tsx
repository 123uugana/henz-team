"use client";

import { CloudOff, CloudRain, Droplets, LocateFixed, MapPin, TriangleAlert, Wind } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  dangerWarningLabel,
  dayLabel,
  getWeatherCodeInfo,
  getWeatherForCurrentLocation,
  isDangerousWeather,
  type Coordinates,
} from "@/lib/weather";
import { useApi } from "@/lib/use-api";
import { useAuthGuard } from "@/lib/use-auth-guard";

const DEFAULT_LOCATION: Coordinates & { label: string } = {
  latitude: 47.9184,
  longitude: 106.9177,
  label: "Улаанбаатар",
};

export default function WeatherPage() {
  useAuthGuard();

  const { data, loading, error, refresh } = useApi(
    () => getWeatherForCurrentLocation(DEFAULT_LOCATION),
    ""
  );

  const current = data?.report.current ?? null;
  const daily = data?.report.daily ?? [];
  const today = daily[0];
  const todayDangerous = current && today ? isDangerousWeather(current.weatherCode, today.windSpeed) : false;
  const warningText = current && today ? dangerWarningLabel(current.weatherCode, today.windSpeed) : "";
  const currentInfo = current ? getWeatherCodeInfo(current.weatherCode) : null;
  const CurrentIcon = currentInfo?.icon ?? null;

  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" title="Цаг агаар" />

      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm text-gray-300">
          <MapPin className="size-4 text-[#f2a93c]" />
          {data?.label ?? (loading ? "Байршил тогтоож байна..." : "Байршил тодорхойгүй")}
        </span>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1 text-xs font-medium text-[#f2a93c] disabled:opacity-50"
        >
          <LocateFixed className={cn("size-3.5", loading && "animate-pulse")} />
          Шинэчлэх
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-5">
        {loading && !data ? (
          <p className="mt-10 text-center text-sm text-gray-500">
            Цаг агаарын мэдээ ачаалж байна...
          </p>
        ) : error && !data ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CloudOff className="size-8 text-gray-500" strokeWidth={1.5} />
            <p className="text-sm text-red-400">{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="text-xs font-medium text-[#f2a93c]"
            >
              Дахин оролдох
            </button>
          </div>
        ) : (
          <>
            {data?.fallback ? (
              <p className="text-xs text-gray-500">
                Байршил тодорхойлж чадаагүй тул Улаанбаатарын цаг агаарыг харуулж байна.
              </p>
            ) : null}

            {todayDangerous && warningText ? (
              <Card className="flex-row items-start gap-3 bg-red-500/10 p-4 ring-1 ring-red-500/30">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-400" />
                <p className="text-sm font-medium text-red-400">{warningText}</p>
              </Card>
            ) : null}

            {current && CurrentIcon ? (
              <Card className="gap-4 bg-linear-to-b from-[#1c1408] to-[#141a2c] p-5 ring-1 ring-[#f2a93c]/20">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-5xl font-bold">{current.temperature}°</p>
                    <p className="text-sm text-gray-300">{currentInfo?.label}</p>
                  </div>
                  <CurrentIcon className="size-16 text-[#f2a93c]" strokeWidth={1.25} />
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Wind className="size-4 text-gray-400" />
                    <p className="text-xs font-medium">{current.windSpeed} км/ц</p>
                    <p className="text-[10px] text-gray-500">Салхи</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Droplets className="size-4 text-gray-400" />
                    <p className="text-xs font-medium">{current.humidity}%</p>
                    <p className="text-[10px] text-gray-500">Чийглэг</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <CloudRain className="size-4 text-gray-400" />
                    <p className="text-xs font-medium">{today?.precipitationChance ?? 0}%</p>
                    <p className="text-[10px] text-gray-500">Хур тунадас</p>
                  </div>
                </div>
              </Card>
            ) : null}

            {daily.length > 0 ? (
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-gray-200">7 хоногийн мэдээ</h2>
                <div className="flex flex-col gap-2">
                  {daily.map((day, index) => {
                    const info = getWeatherCodeInfo(day.weatherCode);
                    const dangerous = isDangerousWeather(day.weatherCode, day.windSpeed);
                    const DayIcon = info.icon;

                    return (
                      <Card
                        key={day.date}
                        className={cn(
                          "flex-row items-center gap-3 p-3 ring-1",
                          dangerous
                            ? "bg-red-500/10 ring-red-500/30"
                            : "bg-[#141a2c] ring-white/5"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-full",
                            dangerous ? "bg-red-500/15" : "bg-white/5"
                          )}
                        >
                          <DayIcon
                            className={cn("size-4", dangerous ? "text-red-400" : "text-[#f2a93c]")}
                            strokeWidth={1.75}
                          />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="text-sm font-medium">{dayLabel(day.date, index)}</p>
                          <p className={cn("text-xs", dangerous ? "text-red-400" : "text-gray-400")}>
                            {info.label}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-sm">
                          <span className="font-semibold">{day.maxTemp}°</span>
                          <span className="text-gray-500">{day.minTemp}°</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <BottomNav />
    </PhoneFrame>
  );
}
