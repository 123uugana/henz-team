export interface AnimalHistoryEntry {
  location: string;
  time: string;
  note: string;
}

export interface Animal {
  id: string;
  tagId: string;
  name: string;
  species: "Хонь" | "Ямаа";
  description: string;
  lastSeen: string;
  status: "returned" | "missing";
  history: AnimalHistoryEntry[];
}

export const animals: Animal[] = [
  {
    id: "mn-990-2023-a",
    tagId: "MN-990-2023-A",
    name: "Цагаан хуц",
    species: "Хонь",
    description: "Цагаан үстэй, том эвэртэй хуц.",
    lastSeen: "Өнөөдөр, 16:45",
    status: "returned",
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
    tagId: "AA-7492",
    name: "Хурга",
    species: "Хонь",
    description: "Цагаан үсэмний, баруун чихэндээ шигтгээтэй",
    lastSeen: "14 цагийн өмнө",
    status: "missing",
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
    tagId: "AG-3011",
    name: "Ишиг",
    species: "Ямаа",
    description: "Хар үстэй, солдог шинж тэмдэгтэй",
    lastSeen: "18 цагийн өмнө",
    status: "missing",
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
    tagId: "AA-8820",
    name: "Хурга",
    species: "Хонь",
    description: "Халзан үсэмтэй",
    lastSeen: "1 өдрийн өмнө",
    status: "missing",
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
    tagId: "#0492",
    name: "Хуц",
    species: "Хонь",
    description: "Баруун талбайд сүүлд харагдсан.",
    lastSeen: "3 цагийн өмнө",
    status: "missing",
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
    tagId: "#1103",
    name: "Ишиг",
    species: "Ямаа",
    description: "Цагаан өнгөтэй.",
    lastSeen: "1 цагийн өмнө",
    status: "missing",
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
    tagId: "#0821",
    name: "Эм хонь",
    species: "Хонь",
    description: "Цагаан өнгөтэй.",
    lastSeen: "4 цагийн өмнө",
    status: "missing",
    history: [
      {
        location: "Цагаан хаалга",
        time: "4 цагийн өмнө",
        note: "Сүргээс тасарч алга болсон.",
      },
    ],
  },
];

export function getAnimal(id: string) {
  return animals.find((animal) => animal.id === id);
}
