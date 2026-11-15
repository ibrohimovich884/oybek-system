export const PERSON_CATEGORIES = [
  { value: "all", label: "Barchasi" },
  { value: "friend", label: "Do'st" },
  { value: "acquaintance", label: "Tanish" },
  { value: "classmate", label: "Sinfdosh / Kursdosh" },
  { value: "coworker", label: "Hamkasb" },
  { value: "relative", label: "Qarindosh" },
  { value: "other", label: "Boshqa" },
];

export const CATEGORY_LABELS = {
  friend: "Do'st",
  acquaintance: "Tanish",
  classmate: "Sinfdosh",
  coworker: "Hamkasb",
  relative: "Qarindosh",
  other: "Boshqa",
};

export const STATUS_LABELS = {
  active: "Faol aloqada",
  lost_contact: "Aloqa uzilgan",
};

export const GENDER_LABELS = {
  female: "Qiz bola",
  male: "O'g'il bola",
  other: "Boshqa",
};

export const CRUSH_STATUSES = [
  { value: "all", label: "Barcha bosqichlar" },
  { value: "interest", label: "Qiziqish uyg'ondi", desc: "Shunchaki qiziqish" },
  { value: "liked", label: "Yoqtirib qoldim", desc: "Tuyg'u paydo bo'ldi" },
  { value: "talking", label: "Gaplashyapmiz", desc: "Muntazam suhbatda" },
  { value: "close", label: "Yaqinlashdik", desc: "Juda yaqin aloqa" },
  { value: "dating", label: "Munosabatda", desc: "Birgamiz" },
  { value: "unclear", label: "Noaniq", desc: "Vaziyat noaniq" },
  { value: "cooled", label: "Sovub qoldi", desc: "Tuyg'ular pasaygan" },
  { value: "ended", label: "Tugadi", desc: "Munosabat yakunlangan" },
  { value: "became_friend", label: "Do'st bo'lib qoldik", desc: "Do'stlikka aylandi" },
];

export const CRUSH_STATUS_LABELS = {
  interest: "Qiziqish uyg'ondi",
  liked: "Yoqtirib qoldim",
  talking: "Gaplashyapmiz",
  close: "Yaqinlashdik",
  dating: "Munosabatda",
  unclear: "Noaniq",
  cooled: "Sovub qoldi",
  ended: "Tugadi",
  became_friend: "Do'st bo'lib qoldik",
};

export const TRUST_LEVELS = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

export const TRUST_LEVEL_CONFIG = {
  high: {
    value: "high",
    label: "Yuqori ishonch",
    shortLabel: "Yuqori",
    fullLabel: "Yuqori (Ishonchli)",
    badge: "Yuqori ishonch",
    hint: "Soʻzida turadi, toʻliq ishonish mumkin",
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.14)",
    border: "rgba(34, 197, 94, 0.35)",
    suggestedProbability: "high",
    order: 1,
  },
  medium: {
    value: "medium",
    label: "Oʻrtacha ishonch",
    shortLabel: "Oʻrtacha",
    fullLabel: "Oʻrtacha (Oddiy)",
    badge: "Oʻrtacha ishonch",
    hint: "Oddiy tanishlik, meʼyorida ishonch",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.14)",
    border: "rgba(245, 158, 11, 0.35)",
    suggestedProbability: "medium",
    order: 2,
  },
  low: {
    value: "low",
    label: "Past ishonch",
    shortLabel: "Past",
    fullLabel: "Past (Ehtiyot boʻlish kerak)",
    badge: "Past ishonch",
    hint: "Sinovdan oʻtmagan yoki ishonchsiz",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.14)",
    border: "rgba(239, 68, 68, 0.35)",
    suggestedProbability: "low",
    order: 3,
  },
};

export const TRUST_LEVEL_OPTIONS = [
  TRUST_LEVEL_CONFIG.high,
  TRUST_LEVEL_CONFIG.medium,
  TRUST_LEVEL_CONFIG.low,
];

export function getTrustLevelInfo(level) {
  return TRUST_LEVEL_CONFIG[level] || TRUST_LEVEL_CONFIG.medium;
}

