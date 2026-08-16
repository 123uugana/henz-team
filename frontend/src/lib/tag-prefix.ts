export interface TagPrefixInfo {
  prefix: string;
  label: string;
  textClass: string;
  bgClass: string;
  ringClass: string;
}

export const TAG_PREFIXES: TagPrefixInfo[] = [
  {
    prefix: "HH-",
    label: "Хэнц Хурга систем",
    textClass: "text-[#f2a93c]",
    bgClass: "bg-[#f2a93c]/15",
    ringClass: "ring-[#f2a93c]/30",
  },
  {
    prefix: "EXT-",
    label: "Гадаад / өөр айлын мал",
    textClass: "text-red-400",
    bgClass: "bg-red-500/15",
    ringClass: "ring-red-500/30",
  },
  {
    prefix: "VET-",
    label: "Мал эмнэлгийн бүртгэл",
    textClass: "text-teal-400",
    bgClass: "bg-teal-500/15",
    ringClass: "ring-teal-500/30",
  },
  {
    prefix: "GOV-",
    label: "Засгийн газрын бүртгэл",
    textClass: "text-sky-400",
    bgClass: "bg-sky-500/15",
    ringClass: "ring-sky-500/30",
  },
  {
    prefix: "UNK-",
    label: "Тодорхойгүй / шинэ tag",
    textClass: "text-gray-400",
    bgClass: "bg-white/10",
    ringClass: "ring-white/20",
  },
];

const FALLBACK = TAG_PREFIXES[TAG_PREFIXES.length - 1];

export function getTagPrefixInfo(epc: string): TagPrefixInfo {
  const upper = epc.toUpperCase();
  return TAG_PREFIXES.find((entry) => upper.startsWith(entry.prefix)) ?? FALLBACK;
}
