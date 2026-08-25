export interface TagPrefixInfo {
  prefix: string;
  label: string;
  textClass: string;
  bgClass: string;
  ringClass: string;
}

export const TAG_PREFIXES: TagPrefixInfo[] = [
  {
    prefix: "H-",
    label: "Хэнц Хурга · Хонь",
    textClass: "text-[#a85b0a] dark:text-[#f2a93c]",
    bgClass: "bg-[#f2a93c]/15",
    ringClass: "ring-[#f2a93c]/30",
  },
  {
    prefix: "Y-",
    label: "Хэнц Хурга · Ямаа",
    textClass: "text-[#a85b0a] dark:text-[#f2a93c]",
    bgClass: "bg-[#f2a93c]/15",
    ringClass: "ring-[#f2a93c]/30",
  },
  {
    prefix: "HH-",
    label: "Хэнц Хурга систем",
    textClass: "text-[#a85b0a] dark:text-[#f2a93c]",
    bgClass: "bg-[#f2a93c]/15",
    ringClass: "ring-[#f2a93c]/30",
  },
  {
    prefix: "EXT-",
    label: "Гадаад / өөр айлын мал",
    textClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/15",
    ringClass: "ring-red-500/30",
  },
  {
    prefix: "VET-",
    label: "Мал эмнэлгийн бүртгэл",
    textClass: "text-teal-700 dark:text-teal-400",
    bgClass: "bg-teal-500/15",
    ringClass: "ring-teal-500/30",
  },
  {
    prefix: "GOV-",
    label: "Засгийн газрын бүртгэл",
    textClass: "text-sky-700 dark:text-sky-400",
    bgClass: "bg-sky-500/15",
    ringClass: "ring-sky-500/30",
  },
  {
    prefix: "UNK-",
    label: "Тодорхойгүй / шинэ tag",
    textClass: "text-slate-500 dark:text-gray-400",
    bgClass: "bg-slate-100 dark:bg-white/5",
    ringClass: "ring-slate-200 dark:ring-white/10",
  },
];

const FALLBACK = TAG_PREFIXES[TAG_PREFIXES.length - 1];

export function getTagPrefixInfo(epc: string): TagPrefixInfo {
  const upper = epc.toUpperCase();
  return TAG_PREFIXES.find((entry) => upper.startsWith(entry.prefix)) ?? FALLBACK;
}
