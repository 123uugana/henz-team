import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from "lucide-react";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

/** Wind speed (km/h) at/above which conditions are treated as dangerous regardless of the WMO code. */
const STORM_WIND_KMH = 50;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface WeatherCurrent {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
}

export interface WeatherDay {
  date: string;
  weatherCode: number;
  maxTemp: number;
  minTemp: number;
  precipitationChance: number;
  windSpeed: number;
}

export interface WeatherReport {
  current: WeatherCurrent;
  daily: WeatherDay[];
}

interface WeatherCodeInfo {
  label: string;
  icon: LucideIcon;
  dangerous?: boolean;
}

const FALLBACK_WEATHER_CODE: WeatherCodeInfo = { label: "Тодорхойгүй", icon: Cloud };

// WMO weather codes as returned by Open-Meteo, translated to Mongolian.
const WEATHER_CODES: Record<number, WeatherCodeInfo> = {
  0: { label: "Цэлмэг", icon: Sun },
  1: { label: "Голдуу цэлмэг", icon: Sun },
  2: { label: "Хэсэгчлэн үүлтэй", icon: CloudSun },
  3: { label: "Бүрхэг", icon: Cloud },
  45: { label: "Манантай", icon: CloudFog },
  48: { label: "Хяруу манантай", icon: CloudFog },
  51: { label: "Сул шивэр бороо", icon: CloudDrizzle },
  53: { label: "Шивэр бороо", icon: CloudDrizzle },
  55: { label: "Хүчтэй шивэр бороо", icon: CloudDrizzle },
  56: { label: "Мөсөн шивэр бороо", icon: CloudDrizzle, dangerous: true },
  57: { label: "Хүчтэй мөсөн шивэр бороо", icon: CloudDrizzle, dangerous: true },
  61: { label: "Сул бороо", icon: CloudRain },
  63: { label: "Бороо", icon: CloudRain },
  65: { label: "Хүчтэй бороо", icon: CloudRainWind, dangerous: true },
  66: { label: "Мөсөн бороо", icon: CloudRainWind, dangerous: true },
  67: { label: "Хүчтэй мөсөн бороо", icon: CloudRainWind, dangerous: true },
  71: { label: "Сул цас", icon: CloudSnow },
  73: { label: "Цас", icon: CloudSnow },
  75: { label: "Хүчтэй цас", icon: CloudSnow, dangerous: true },
  77: { label: "Мөндөр цас", icon: CloudSnow },
  80: { label: "Сул аадар бороо", icon: CloudRain },
  81: { label: "Аадар бороо", icon: CloudRain },
  82: { label: "Хүчтэй аадар бороо", icon: CloudRainWind, dangerous: true },
  85: { label: "Сул аадар цас", icon: CloudSnow },
  86: { label: "Хүчтэй аадар цас", icon: CloudSnow, dangerous: true },
  95: { label: "Аянга цахилгаантай", icon: CloudLightning, dangerous: true },
  96: { label: "Мөндөртэй аянга цахилгаан", icon: CloudLightning, dangerous: true },
  99: { label: "Хүчтэй мөндөртэй аянга цахилгаан", icon: CloudLightning, dangerous: true },
};

const WEEKDAY_LABELS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

export function getWeatherCodeInfo(code: number): WeatherCodeInfo {
  return WEATHER_CODES[code] ?? FALLBACK_WEATHER_CODE;
}

export function isDangerousWeather(code: number, windSpeedKmh: number): boolean {
  return Boolean(getWeatherCodeInfo(code).dangerous) || windSpeedKmh >= STORM_WIND_KMH;
}

export function dangerWarningLabel(code: number, windSpeedKmh: number): string {
  const info = getWeatherCodeInfo(code);
  if (info.dangerous) {
    return `Аюултай цаг агаарын үзэгдэл: ${info.label}. Мал сүргээ хамгаалж, гадаа орчинд болгоомжтой байгаарай.`;
  }
  if (windSpeedKmh >= STORM_WIND_KMH) {
    return "Хүчтэй салхины анхааруулга. Мал сүргээ бэлчээрт гаргахдаа болгоомжтой байгаарай.";
  }
  return "";
}

export function dayLabel(dateIso: string, index: number): string {
  if (index === 0) return "Өнөөдөр";
  if (index === 1) return "Маргааш";
  return WEEKDAY_LABELS[new Date(dateIso).getDay()];
}

/** Wraps the browser geolocation callback API in a promise. */
export function locateDevice(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Энэ төхөөрөмж байршил тогтоох боломжгүй байна."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 5 * 60_000,
    });
  });
}

/** Free, no-key reverse geocoding meant for client-side use. */
export async function reverseGeocode({ latitude, longitude }: Coordinates): Promise<string> {
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: "mn",
  });

  const response = await fetch(`${REVERSE_GEOCODE_URL}?${query.toString()}`);
  if (!response.ok) throw new Error("Байршил тодорхойлж чадсангүй.");

  const json = (await response.json()) as {
    locality?: string;
    city?: string;
    principalSubdivision?: string;
  };

  const parts = [json.locality || json.city, json.principalSubdivision].filter(
    (part, index, all): part is string => Boolean(part) && all.indexOf(part) === index
  );

  return parts.length > 0 ? parts.join(", ") : "Миний байршил";
}

export interface LocatedWeatherReport {
  report: WeatherReport;
  label: string;
  fallback: boolean;
}

/** Geolocates the device, reverse-geocodes it to a place name, and fetches its forecast — falling back to Ulaanbaatar if location access fails. */
export async function getWeatherForCurrentLocation(
  fallbackLocation: Coordinates & { label: string }
): Promise<LocatedWeatherReport> {
  let point: Coordinates = fallbackLocation;
  let fallback = false;

  try {
    const position = await locateDevice();
    point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    fallback = true;
  }

  const [report, label] = await Promise.all([
    fetchWeather(point),
    fallback
      ? Promise.resolve(fallbackLocation.label)
      : reverseGeocode(point).catch(() => "Миний байршил"),
  ]);

  return { report, label, fallback };
}

export async function fetchWeather({ latitude, longitude }: Coordinates): Promise<WeatherReport> {
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
    timezone: "auto",
    forecast_days: "7",
  });

  const response = await fetch(`${OPEN_METEO_URL}?${query.toString()}`);
  if (!response.ok) throw new Error("Цаг агаарын мэдээ авч чадсангүй.");

  const json = (await response.json()) as {
    current: {
      temperature_2m: number;
      relative_humidity_2m: number;
      weather_code: number;
      wind_speed_10m: number;
    };
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: number[];
      wind_speed_10m_max: number[];
    };
  };

  const current: WeatherCurrent = {
    temperature: Math.round(json.current.temperature_2m),
    weatherCode: json.current.weather_code,
    windSpeed: Math.round(json.current.wind_speed_10m),
    humidity: Math.round(json.current.relative_humidity_2m),
  };

  const daily: WeatherDay[] = json.daily.time.map((date, i) => ({
    date,
    weatherCode: json.daily.weather_code[i],
    maxTemp: Math.round(json.daily.temperature_2m_max[i]),
    minTemp: Math.round(json.daily.temperature_2m_min[i]),
    precipitationChance: json.daily.precipitation_probability_max[i] ?? 0,
    windSpeed: Math.round(json.daily.wind_speed_10m_max[i]),
  }));

  return { current, daily };
}
