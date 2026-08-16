// Local, browser-persisted "database" for the prototype. The shape intentionally
// mirrors the real backend schema (see backend/worker/src/db/schema.ts) so wiring
// this up to the actual API later is a matter of swapping these functions for
// fetch calls, not redesigning the UI.

import { useSyncExternalStore } from "react";

export type AnimalStatus = "ACTIVE" | "MISSING" | "SOLD";
export type Gender = "MALE" | "FEMALE" | "UNKNOWN";
export type Species = "Хонь" | "Ямаа";

export interface AnimalHistoryEntry {
  location: string;
  time: string;
  note: string;
}

export interface AnimalLocation {
  lat: number;
  lng: number;
  updatedAt: string;
}

export interface Animal {
  id: string;
  tagEpc: string;
  name: string;
  species: Species;
  gender: Gender;
  birthYear?: number;
  description: string;
  lastSeen: string;
  status: AnimalStatus;
  imageUrl?: string | null;
  location?: AnimalLocation | null;
  history: AnimalHistoryEntry[];
}

export type TagStatus = "AVAILABLE" | "CLAIMED" | "LOCKED" | "DAMAGED";

export interface RfidTag {
  epc: string;
  status: TagStatus;
  claimedBy?: string;
  claimedAt?: string;
  livestockId?: string | null;
}

export interface ScanEvent {
  id: string;
  tagEpc: string;
  animalId?: string | null;
  animalName?: string;
  direction: "ENTER" | "EXIT";
  time: string;
  readerName: string;
}

export type NotificationType =
  | "missing"
  | "battery"
  | "motion"
  | "census"
  | "external";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  day: "өнөөдөр" | "өчигдөр";
  time: string;
  unread: boolean;
  href?: string | null;
  meta?: { tag?: string; owner?: string; gate?: string };
}

export interface DealerRegistration {
  id: string;
  orgName: string;
  contact: string;
  prefixRequested: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
}

export interface HistoryPoint {
  label: string;
  total: number;
}

export interface HistoryRange {
  points: HistoryPoint[];
  added: number;
  removed: number;
  todayDelta: number;
  weeklyAverage: number;
}

interface StoreShape {
  animals: Animal[];
  tags: RfidTag[];
  scans: ScanEvent[];
  notifications: AppNotification[];
  registrations: DealerRegistration[];
}

const STORE_KEY = "hents-hurga-store";

function seedAnimals(): Animal[] {
  return [
    {
      id: "mn-990-2023-a",
      tagEpc: "HH-990230",
      name: "Цагаан хуц",
      species: "Хонь",
      gender: "MALE",
      birthYear: 2023,
      description: "Цагаан үстэй, том эвэртэй хуц.",
      lastSeen: "Өнөөдөр, 16:45",
      status: "ACTIVE",
      imageUrl: null,
      location: { lat: 47.9184, lng: 106.9177, updatedAt: "Өнөөдөр, 16:45" },
      history: [
        {
          location: "Зүүн хаалга",
          time: "Өнөөдөр, 16:45",
          note: "Сүрэгт буцаж ирсэн. Мэдрэгч амжилттай уншсан.",
        },
        {
          location: "Зүүн хаалга",
          time: "Өнөөдөр, 07:15",
          note: "Бэлчээрт гарсан.",
        },
      ],
    },
    {
      id: "aa-7492",
      tagEpc: "HH-7492",
      name: "Хурга",
      species: "Хонь",
      gender: "FEMALE",
      birthYear: 2025,
      description: "Цагаан үсэмний, баруун чихэндээ шигтгээтэй",
      lastSeen: "14 цагийн өмнө",
      status: "MISSING",
      imageUrl: null,
      location: null,
      history: [
        {
          location: "Баруун хаалга",
          time: "14 цагийн өмнө",
          note: "Сүргээс тасарч алга болсон.",
        },
      ],
    },
    {
      id: "ag-3011",
      tagEpc: "HH-3011",
      name: "Ишиг",
      species: "Ямаа",
      gender: "MALE",
      birthYear: 2025,
      description: "Хар үстэй, солдог шинж тэмдэгтэй",
      lastSeen: "18 цагийн өмнө",
      status: "MISSING",
      imageUrl: null,
      location: null,
      history: [
        {
          location: "Зүүн хаалга",
          time: "18 цагийн өмнө",
          note: "Сүргээс тасарч алга болсон.",
        },
      ],
    },
    {
      id: "aa-8820",
      tagEpc: "HH-8820",
      name: "Хурга",
      species: "Хонь",
      gender: "FEMALE",
      birthYear: 2024,
      description: "Халзан үсэмтэй",
      lastSeen: "1 өдрийн өмнө",
      status: "MISSING",
      imageUrl: null,
      location: null,
      history: [
        {
          location: "Баруун хаалга",
          time: "1 өдрийн өмнө",
          note: "Сүргээс тасарч алга болсон.",
        },
      ],
    },
    {
      id: "0492",
      tagEpc: "HH-0492",
      name: "Хуц",
      species: "Хонь",
      gender: "MALE",
      birthYear: 2022,
      description: "Баруун талбайд сүүлд харагдсан.",
      lastSeen: "3 цагийн өмнө",
      status: "MISSING",
      imageUrl: null,
      location: null,
      history: [
        {
          location: "Баруун талбай",
          time: "3 цагийн өмнө",
          note: "Сүргээс тасарч алга болсон.",
        },
      ],
    },
    {
      id: "1103",
      tagEpc: "HH-1103",
      name: "Ишиг",
      species: "Ямаа",
      gender: "FEMALE",
      birthYear: 2025,
      description: "Цагаан өнгөтэй.",
      lastSeen: "1 цагийн өмнө",
      status: "MISSING",
      imageUrl: null,
      location: null,
      history: [
        {
          location: "Цагаан хаалга",
          time: "1 цагийн өмнө",
          note: "Сүргээс тасарч алга болсон.",
        },
      ],
    },
    {
      id: "0821",
      tagEpc: "HH-0821",
      name: "Эм хонь",
      species: "Хонь",
      gender: "FEMALE",
      birthYear: 2021,
      description: "Цагаан өнгөтэй.",
      lastSeen: "4 цагийн өмнө",
      status: "MISSING",
      imageUrl: null,
      location: null,
      history: [
        {
          location: "Цагаан хаалга",
          time: "4 цагийн өмнө",
          note: "Сүргээс тасарч алга болсон.",
        },
      ],
    },
    {
      id: "hh-4928",
      tagEpc: "HH-4928",
      name: "Хонь",
      species: "Хонь",
      gender: "FEMALE",
      birthYear: 2022,
      description: "Хар толботой.",
      lastSeen: "2 минутын өмнө",
      status: "ACTIVE",
      imageUrl: null,
      location: { lat: 47.9201, lng: 106.9155, updatedAt: "2 минутын өмнө" },
      history: [
        {
          location: "Зүүн хаалга",
          time: "2 минутын өмнө",
          note: "Сүрэгт орсон.",
        },
      ],
    },
    {
      id: "hh-1103b",
      tagEpc: "HH-1103B",
      name: "Ямаа",
      species: "Ямаа",
      gender: "MALE",
      birthYear: 2023,
      description: "Саарал өнгөтэй.",
      lastSeen: "5 минутын өмнө",
      status: "ACTIVE",
      imageUrl: null,
      location: { lat: 47.9195, lng: 106.917, updatedAt: "5 минутын өмнө" },
      history: [
        {
          location: "Зүүн хаалга",
          time: "5 минутын өмнө",
          note: "Сүрэгт орсон.",
        },
      ],
    },
    {
      id: "ext-002fa",
      tagEpc: "EXT-002FA",
      name: "Тодорхойгүй мал",
      species: "Хонь",
      gender: "UNKNOWN",
      description: "Өөр айлын бүртгэлтэй мал. Эзэн: Б.Дамдин (Баянгол баг).",
      lastSeen: "Өнөөдөр, 09:47",
      status: "ACTIVE",
      imageUrl: null,
      location: null,
      history: [
        {
          location: "RFID Gate-001",
          time: "Өнөөдөр, 09:47",
          note: "Таны хашаанд орсон нь бүртгэгдлээ. Эзэн: Б.Дамдин (Баянгол баг).",
        },
      ],
    },
  ];
}

function seedTags(): RfidTag[] {
  return [
    { epc: "HH-990230", status: "LOCKED", claimedBy: "Та", livestockId: "mn-990-2023-a" },
    { epc: "HH-7492", status: "LOCKED", claimedBy: "Та", livestockId: "aa-7492" },
    { epc: "HH-3011", status: "LOCKED", claimedBy: "Та", livestockId: "ag-3011" },
    { epc: "HH-8820", status: "LOCKED", claimedBy: "Та", livestockId: "aa-8820" },
    { epc: "HH-0492", status: "LOCKED", claimedBy: "Та", livestockId: "0492" },
    { epc: "HH-1103", status: "LOCKED", claimedBy: "Та", livestockId: "1103" },
    { epc: "HH-0821", status: "LOCKED", claimedBy: "Та", livestockId: "0821" },
    { epc: "HH-4928", status: "LOCKED", claimedBy: "Та", livestockId: "hh-4928" },
    { epc: "HH-1103B", status: "LOCKED", claimedBy: "Та", livestockId: "hh-1103b" },
    { epc: "HH-2201", status: "AVAILABLE" },
    { epc: "HH-2202", status: "AVAILABLE" },
    { epc: "HH-2203", status: "AVAILABLE" },
    { epc: "EXT-002FA", status: "CLAIMED", claimedBy: "Б.Дамдин (Баянгол баг)" },
    { epc: "VET-1187", status: "DAMAGED" },
  ];
}

function seedScans(): ScanEvent[] {
  return [
    {
      id: "scan-1",
      tagEpc: "HH-0145",
      animalId: null,
      animalName: "Халзан",
      direction: "ENTER",
      time: "09:15:22",
      readerName: "Зүүн хаалга",
    },
    {
      id: "scan-2",
      tagEpc: "HH-4928",
      animalId: "hh-4928",
      animalName: "Хонь #4928",
      direction: "ENTER",
      time: "2 минутын өмнө",
      readerName: "Зүүн хаалга",
    },
    {
      id: "scan-3",
      tagEpc: "HH-1103B",
      animalId: "hh-1103b",
      animalName: "Ямаа #1103",
      direction: "ENTER",
      time: "5 минутын өмнө",
      readerName: "Зүүн хаалга",
    },
  ];
}

function seedNotifications(): AppNotification[] {
  return [
    {
      id: "n-missing-lambs",
      type: "missing",
      title: "Хурга алга болсон",
      message:
        "Хотын баруун хашаанд захиас 2 хурга тасарч явсан байна. Яаралтай шалгана уу.",
      day: "өнөөдөр",
      time: "10:45",
      unread: true,
      href: "/missing",
    },
    {
      id: "n-battery-low",
      type: "battery",
      title: "Төхөөрөмжийн цэнэг бага",
      message:
        "Дрон-02 төхөөрөмжийн батерей 15% хүрсэн байна. Цэнэглэгчид залгана уу.",
      day: "өнөөдөр",
      time: "08:12",
      unread: true,
      href: "/devices",
    },
    {
      id: "n-external",
      type: "external",
      title: "Гадаад мал илэрлээ",
      message: "Таны хашаанд өөр айлын бүртгэлтэй мал орж ирлээ.",
      day: "өнөөдөр",
      time: "09:47",
      unread: true,
      href: "/animals/ext-002fa",
      meta: { tag: "EXT-002FA", owner: "Б.Дамдин (Баянгол баг)", gate: "RFID Gate-001" },
    },
    {
      id: "n-motion",
      type: "motion",
      title: "Гадаас хөдөлгөөн илэрлээ",
      message:
        "Зүүн хойд зурт сургийн гадна хөдөлгөөн бүртгэгдлээ. Камерын дэлгэцийг шалгана уу.",
      day: "өчигдөр",
      time: "19:30",
      unread: false,
      href: null,
    },
    {
      id: "n-census",
      type: "census",
      title: "Тооллого амжилттай",
      message: "Оройн зэлж тооллого дуусла. Нийт 450 толгой мал бүрэн байна.",
      day: "өчигдөр",
      time: "17:00",
      unread: false,
      href: null,
    },
  ];
}

function seedRegistrations(): DealerRegistration[] {
  return [
    {
      id: "reg-1",
      orgName: "Баянгол Малын Хоршоо",
      contact: "Б.Дамдин, 9911-2233",
      prefixRequested: "EXT-",
      status: "PENDING",
      requestedAt: "2 өдрийн өмнө",
    },
    {
      id: "reg-2",
      orgName: "Төв Мал Эмнэлэг",
      contact: "С.Оюун, 9955-6677",
      prefixRequested: "VET-",
      status: "APPROVED",
      requestedAt: "1 сарын өмнө",
    },
  ];
}

function seedStore(): StoreShape {
  return {
    animals: seedAnimals(),
    tags: seedTags(),
    scans: seedScans(),
    notifications: seedNotifications(),
    registrations: seedRegistrations(),
  };
}

function loadStore(): StoreShape {
  if (typeof window === "undefined") return seedStore();

  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return seedStore();
    return JSON.parse(raw) as StoreShape;
  } catch {
    return seedStore();
  }
}

function saveStore(store: StoreShape) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

// A tiny external-store cache so useSyncExternalStore can return a stable
// reference between renders and broadcast to every subscribed component
// whenever a mutation happens, instead of each hook re-reading independently.
let cachedStore: StoreShape | null = null;
const listeners = new Set<() => void>();

// getServerSnapshot must return the same reference on every call, so the
// seed data used for SSR/hydration is computed once at module load.
const SEED_SNAPSHOT = seedStore();

function getCachedStore(): StoreShape {
  if (!cachedStore) cachedStore = loadStore();
  return cachedStore;
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribeToStore(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function mutate(updater: (store: StoreShape) => StoreShape) {
  const next = updater(getCachedStore());
  saveStore(next);
  cachedStore = next;
  notifyListeners();
  return next;
}

export function resetStore() {
  cachedStore = seedStore();
  saveStore(cachedStore);
  notifyListeners();
}

// --- Animals ---------------------------------------------------------------

export function getAnimals(): Animal[] {
  return loadStore().animals;
}

export function getAnimal(id: string): Animal | undefined {
  return loadStore().animals.find((animal) => animal.id === id);
}

export function updateAnimalStatus(id: string, status: AnimalStatus) {
  return mutate((store) => ({
    ...store,
    animals: store.animals.map((animal) =>
      animal.id === id ? { ...animal, status } : animal
    ),
  })).animals.find((animal) => animal.id === id);
}

export function updateAnimalLocation(id: string, location: AnimalLocation) {
  return mutate((store) => ({
    ...store,
    animals: store.animals.map((animal) =>
      animal.id === id ? { ...animal, location } : animal
    ),
  })).animals.find((animal) => animal.id === id);
}

export function updateAnimalImage(id: string, imageUrl: string) {
  return mutate((store) => ({
    ...store,
    animals: store.animals.map((animal) =>
      animal.id === id ? { ...animal, imageUrl } : animal
    ),
  })).animals.find((animal) => animal.id === id);
}

export function addAnimal(animal: Animal) {
  mutate((store) => ({ ...store, animals: [animal, ...store.animals] }));
}

// --- RFID tags ---------------------------------------------------------------

export function getTags(): RfidTag[] {
  return loadStore().tags;
}

export function getTag(epc: string): RfidTag | undefined {
  return loadStore().tags.find((tag) => tag.epc.toUpperCase() === epc.toUpperCase());
}

export function claimTag(epc: string, claimedBy: string, livestockId?: string) {
  return mutate((store) => {
    const exists = store.tags.some(
      (tag) => tag.epc.toUpperCase() === epc.toUpperCase()
    );
    const nextTags = exists
      ? store.tags.map((tag) =>
          tag.epc.toUpperCase() === epc.toUpperCase()
            ? {
                ...tag,
                status: "LOCKED" as const,
                claimedBy,
                claimedAt: "Дөнгөж сая",
                livestockId: livestockId ?? tag.livestockId,
              }
            : tag
        )
      : [
          ...store.tags,
          {
            epc,
            status: "LOCKED" as const,
            claimedBy,
            claimedAt: "Дөнгөж сая",
            livestockId,
          },
        ];

    return { ...store, tags: nextTags };
  });
}

export function unlockTag(epc: string) {
  mutate((store) => ({
    ...store,
    tags: store.tags.map((tag) =>
      tag.epc === epc
        ? { ...tag, status: "AVAILABLE" as const, claimedBy: undefined, claimedAt: undefined, livestockId: null }
        : tag
    ),
  }));
}

// --- Scans -------------------------------------------------------------------

export function getScans(): ScanEvent[] {
  return loadStore().scans;
}

// --- Notifications -------------------------------------------------------------------

export function getNotifications(): AppNotification[] {
  return loadStore().notifications;
}

export function markNotificationRead(id: string) {
  mutate((store) => ({
    ...store,
    notifications: store.notifications.map((n) =>
      n.id === id ? { ...n, unread: false } : n
    ),
  }));
}

export function markAllNotificationsRead() {
  mutate((store) => ({
    ...store,
    notifications: store.notifications.map((n) => ({ ...n, unread: false })),
  }));
}

// --- Dealer registrations -------------------------------------------------------------------

export function getRegistrations(): DealerRegistration[] {
  return loadStore().registrations;
}

export function setRegistrationStatus(
  id: string,
  status: "APPROVED" | "REJECTED"
) {
  mutate((store) => ({
    ...store,
    registrations: store.registrations.map((r) =>
      r.id === id ? { ...r, status } : r
    ),
  }));
}

// --- Movement history (mock time series) -------------------------------------------------------------------

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

export function getHistory(range: keyof typeof RANGE_DAYS): HistoryRange {
  const days = RANGE_DAYS[range];
  const animals = getAnimals();
  const baseTotal = animals.length + 42;
  const points: HistoryPoint[] = [];
  let seed = days * 7 + baseTotal;

  const pointCount = Math.min(days, 30);
  const step = Math.max(1, Math.floor(days / pointCount));

  for (let i = pointCount; i >= 0; i -= 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const wobble = (seed / 233280 - 0.5) * 4;
    const dayOffset = i * step;
    const value = Math.max(0, Math.round(baseTotal - i * 0.15 + wobble));
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    points.push({
      label: date.toLocaleDateString("mn-MN", { month: "short", day: "numeric" }),
      total: value,
    });
  }

  const added = 8;
  const removed = 6;
  const todayDelta = points.length >= 2 ? points[points.length - 1].total - points[points.length - 2].total : 0;

  return {
    points,
    added,
    removed,
    todayDelta,
    weeklyAverage: -1.2,
  };
}

// --- React hooks -------------------------------------------------------------
//
// Backed by useSyncExternalStore so every subscribed component re-renders
// together whenever any mutation happens, with a seed-data snapshot for SSR
// so hydration never mismatches. `refresh` is kept for call sites that used
// to need it; notifyListeners() already covers them, so it's just a no-op
// trigger that's safe to call after a mutation.

export function useAnimals(): [Animal[], () => void] {
  const animals = useSyncExternalStore(
    subscribeToStore,
    () => getCachedStore().animals,
    () => SEED_SNAPSHOT.animals
  );
  return [animals, notifyListeners];
}

export function useAnimal(id: string): [Animal | undefined, () => void] {
  const animal = useSyncExternalStore(
    subscribeToStore,
    () => getCachedStore().animals.find((a) => a.id === id),
    () => SEED_SNAPSHOT.animals.find((a) => a.id === id)
  );
  return [animal, notifyListeners];
}

export function useTags(): [RfidTag[], () => void] {
  const tags = useSyncExternalStore(
    subscribeToStore,
    () => getCachedStore().tags,
    () => SEED_SNAPSHOT.tags
  );
  return [tags, notifyListeners];
}

export function useScans(): [ScanEvent[], () => void] {
  const scans = useSyncExternalStore(
    subscribeToStore,
    () => getCachedStore().scans,
    () => SEED_SNAPSHOT.scans
  );
  return [scans, notifyListeners];
}

export function useNotifications(): [AppNotification[], () => void] {
  const notifications = useSyncExternalStore(
    subscribeToStore,
    () => getCachedStore().notifications,
    () => SEED_SNAPSHOT.notifications
  );
  return [notifications, notifyListeners];
}

export function useRegistrations(): [DealerRegistration[], () => void] {
  const registrations = useSyncExternalStore(
    subscribeToStore,
    () => getCachedStore().registrations,
    () => SEED_SNAPSHOT.registrations
  );
  return [registrations, notifyListeners];
}
