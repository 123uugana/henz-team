export const adminStatsFallback = {
  totalUsers: 1492,
  totalLivestock: 84029,
  scannedToday: 48,
  missingCount: 12,
  unknownTagCount: 18,
  activeAntennas: 124,
  pendingApprovals: 48,
};

export const adminUsers = [
  {
    name: "Бат-Эрдэнэ Д.",
    phone: "9911****",
    location: "Төв / Баянсүмбэр",
    livestock: "1,245",
    createdAt: "2023-10-15",
    status: "Идэвхтэй",
    tone: "success",
  },
  {
    name: "Алтангэрэл С.",
    phone: "8800****",
    location: "Сэлэнгэ / Мандал",
    livestock: "850",
    createdAt: "2023-11-02",
    status: "Хүлээгдэж буй",
    tone: "warning",
  },
  {
    name: "Ганболд Т.",
    phone: "9999****",
    location: "Дорнод / Хэрлэн",
    livestock: "3,120",
    createdAt: "2023-08-21",
    status: "Блоклогдсон",
    tone: "danger",
  },
  {
    name: "Цэцэгмаа Б.",
    phone: "8080****",
    location: "Хэнтий / Өндөрхаан",
    livestock: "450",
    createdAt: "2023-12-05",
    status: "Идэвхтэй",
    tone: "success",
  },
];

export const adminLivestock = [
  {
    image: "https://images.unsplash.com/photo-1484557985045-edf25e08da73?auto=format&fit=crop&w=120&q=80",
    name: "Хүрэн Халзан",
    tag: "TAG-990-23A-4F",
    type: "Хонь",
    owner: "Бат-Эрдэнэ Т.",
    location: "Төв аймаг, Zone 4",
    status: "Идэвхтэй",
    tone: "success",
  },
  {
    image: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=120&q=80",
    name: "Хар Сүлд",
    tag: "TAG-881-12B-9C",
    type: "Морь",
    owner: "Энхбаяр С.",
    location: "Хэнтий аймаг, 24ц өмнө",
    status: "Анхаарах",
    tone: "danger",
  },
  {
    image: "https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=120&q=80",
    name: "Цагаан Ямаа",
    tag: "TAG-112-99D-3R",
    type: "Ямаа",
    owner: "Нарантуяа Г.",
    location: "Дорнод аймаг, Zone 1",
    status: "Идэвхтэй",
    tone: "success",
  },
  {
    image: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=120&q=80",
    name: "Улаан Үнээ",
    tag: "TAG-554-22X-1K",
    type: "Үхэр",
    owner: "Лхагва Б.",
    location: "Шилжсэн, Oct 12",
    status: "Архив",
    tone: "muted",
  },
];

export const adminDevices = [
  {
    name: "Gate-N-North-01",
    mac: "00:1A:2B:3C:4D:5E",
    owner: "Tuv Aimag Coop",
    status: "Online",
    signal: "-42 dBm",
    lastHeartbeat: "2s ago",
    queue: "0",
    tone: "success",
  },
  {
    name: "Gate-E-South-04",
    mac: "00:1A:2B:3C:9F:11",
    owner: "Dornod Herders Assoc.",
    status: "Warning",
    signal: "-82 dBm",
    lastHeartbeat: "15m ago",
    queue: "24",
    tone: "warning",
  },
  {
    name: "Gate-W-Main-00",
    mac: "00:1A:2B:FF:EE:DD",
    owner: "Khentii Base",
    status: "Offline",
    signal: "N/A",
    lastHeartbeat: "14h ago",
    queue: "1,402",
    tone: "danger",
  },
  {
    name: "Gate-S-Border-12",
    mac: "00:1A:2B:3C:77:21",
    owner: "Selenge Unit",
    status: "Online",
    signal: "-55 dBm",
    lastHeartbeat: "8s ago",
    queue: "0",
    tone: "success",
  },
];

export const tagPrefixes = [
  { value: "SHP", name: "Хонь (Sheep)", color: "#F4F1EA" },
  { value: "GOA", name: "Ямаа (Goat)", color: "#3C4A70" },
  { value: "EXT", name: "Гадаад (External)", color: "#E8A33D" },
  { value: "VET", name: "Эмнэлэг (Vet)", color: "#00A29A" },
  { value: "COP", name: "Хоршоо (Coop)", color: "#835400" },
];

export const sampleAdminTags = [
  { epc: "SHP-1042-88X", status: "CLAIMED" as const, claimedByUserId: "user-1042", claimedAt: "2026-08-29T08:30:00.000Z" },
  { epc: "GOA-9921-12G", status: "LOCKED" as const, claimedByUserId: "user-9921", claimedAt: "2026-08-29T11:15:00.000Z" },
  { epc: "EXT-5543-EXT", status: "AVAILABLE" as const },
  { epc: "VET-1102-VET", status: "DAMAGED" as const, claimedByUserId: "clinic-11", claimedAt: "2026-08-28T16:10:00.000Z" },
];

export const adminDealers = [
  {
    name: '"Алтай Тренд" ХХК',
    phone: "+976 9911-2233",
    region: "Улаанбаатар, СБД",
    status: "Идэвхтэй",
    tone: "success",
  },
  {
    name: '"Говь Агро" ХХК',
    phone: "+976 8800-4455",
    region: "Өмнөговь аймаг",
    status: "Идэвхтэй",
    tone: "success",
  },
  {
    name: '"Хангайн Сүрэг" ХХК',
    phone: "+976 9988-7766",
    region: "Архангай аймаг",
    status: "Идэвхгүй",
    tone: "danger",
  },
  {
    name: '"Дорнод Трейд" ББН',
    phone: "+976 9900-1122",
    region: "Дорнод аймаг",
    status: "Хүлээгдэж буй",
    tone: "warning",
  },
  {
    name: '"Сэлэнгэ Буудай" ХХК',
    phone: "+976 8811-9900",
    region: "Сэлэнгэ аймаг",
    status: "Идэвхтэй",
    tone: "success",
  },
];

export const externalApprovals = [
  {
    org: "Дорнод Махкомбинат ХХК",
    type: "Processing facility",
    contact: "info@dornodmeat.mn\n+976 9911-2233",
    location: "Дорнод, Чойбалсан",
    requestedAt: "2023.10.24 14:30",
    document: "License_2023.pdf",
    status: "Шинэ",
  },
  {
    org: "Тээвэр Ложистик Төв",
    type: "Transport partner",
    contact: "dispatch@tlt.mn\n+976 8800-5544",
    location: "Улаанбаатар, СХД",
    requestedAt: "2023.10.23 09:15",
    document: "Fleet_Cert.pdf",
    status: "Хүлээгдэж буй",
  },
  {
    org: "Номин Ретейл",
    type: "Retailer / endpoint",
    contact: "purchasing@nomin.mn\n+976 7575-1111",
    location: "Улаанбаатар, ХУД",
    requestedAt: "2023.10.22 16:45",
    document: "Retail_Agrmnt.pdf",
    status: "Хүлээгдэж буй",
  },
];

export const recentAdminActions = [
  "Бат-Эрдэнэ шинээр хэрэглэгч үүсгэлээ.",
  "TAG-4920 claim хийгдлээ.",
  "Gate-N04 холболт тасарсан.",
  "Олон тооны (50) tag claim хүсэлт ирлээ.",
];
