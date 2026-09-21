export const DEFAULT_WALLETS = {
  hamyon: 50000,
  naqd: 30000,
  karta: 100000,
  dollar: 0,
};

export const WALLET_CONFIG = {
  hamyon: {
    id: "hamyon",
    label: "Hamyon",
    shortLabel: "Hamyon",
    icon: "Wallet",
    color: "#10b981",
    currency: "UZS",
    badge: "Kundalik",
    description: "Kundalik mayda xarajatlar va o'tkazmalar uchun mustaqil hamyon",
  },
  naqd: {
    id: "naqd",
    label: "Naqd pul",
    shortLabel: "Naqd (oddiy)",
    icon: "Banknote",
    color: "#eab308",
    currency: "UZS",
    badge: "Oddiy",
    description: "Kundalik naqd hisob",
  },
  karta: {
    id: "karta",
    label: "Plastik karta",
    shortLabel: "Karta (oddiy)",
    icon: "CreditCard",
    color: "#38bdf8",
    currency: "UZS",
    badge: "Uzcard / Humo",
    description: "Kundalik bank kartasi hisobi",
  },
  dollar: {
    id: "dollar",
    label: "AQSH Dollari",
    shortLabel: "Dollar (oddiy)",
    icon: "BadgeDollarSign",
    color: "#22c55e",
    currency: "USD",
    badge: "USD",
    description: "Kundalik dollar mablag'i (USD)",
  },
};

export const DEFAULT_RESERVES = {
  "naqd-asosiy": {
    id: "naqd-asosiy",
    wallet: "naqd",
    name: "Naqd Asosiy",
    amount: 0,
    notes: [
      {
        text: "Dastlabki naqd asosiy zaxira balansi shakllantirildi",
        amount_at_that_time: 0,
        editedAt: "2026-09-20T00:00:00+05:00",
      },
    ],
  },
  "karta-asosiy": {
    id: "karta-asosiy",
    wallet: "karta",
    name: "Karta Asosiy",
    amount: 0,
    notes: [
      {
        text: "Dastlabki karta asosiy zaxira balansi shakllantirildi",
        amount_at_that_time: 0,
        editedAt: "2026-09-20T00:00:00+05:00",
      },
    ],
  },
  "dollar-asosiy": {
    id: "dollar-asosiy",
    wallet: "dollar",
    name: "Dollar Asosiy",
    amount: 0,
    notes: [
      {
        text: "Dastlabki dollar asosiy zaxira balansi shakllantirildi",
        amount_at_that_time: 0,
        editedAt: "2026-09-20T00:00:00+05:00",
      },
    ],
  },
};

export const RESERVE_CONFIG = {
  "naqd-asosiy": {
    id: "naqd-asosiy",
    wallet: "naqd",
    label: "Naqd (Asosiy zaxira)",
    shortLabel: "Naqd Asosiy",
    icon: "Vault",
    color: "#ca8a04",
    currency: "UZS",
  },
  "karta-asosiy": {
    id: "karta-asosiy",
    wallet: "karta",
    label: "Karta (Asosiy zaxira)",
    shortLabel: "Karta Asosiy",
    icon: "Landmark",
    color: "#0284c7",
    currency: "UZS",
  },
  "dollar-asosiy": {
    id: "dollar-asosiy",
    wallet: "dollar",
    label: "Dollar (Asosiy zaxira)",
    shortLabel: "Dollar Asosiy",
    icon: "ShieldAlert",
    color: "#16a34a",
    currency: "USD",
  },
};

export const ALL_BALANCES_LIST = [
  { id: "hamyon", label: "Hamyon (Kundalik)", category: "oddiy", currency: "UZS", color: "#10b981" },
  { id: "naqd", label: "Naqd (Oddiy)", category: "oddiy", currency: "UZS", color: "#eab308" },
  { id: "karta", label: "Karta (Oddiy)", category: "oddiy", currency: "UZS", color: "#38bdf8" },
  { id: "dollar", label: "Dollar (Oddiy)", category: "oddiy", currency: "USD", color: "#22c55e" },
  { id: "naqd-asosiy", label: "Naqd (Asosiy zaxira)", category: "asosiy", currency: "UZS", color: "#ca8a04" },
  { id: "karta-asosiy", label: "Karta (Asosiy zaxira)", category: "asosiy", currency: "UZS", color: "#0284c7" },
  { id: "dollar-asosiy", label: "Dollar (Asosiy zaxira)", category: "asosiy", currency: "USD", color: "#16a34a" },
];

/**
 * 5. Kutilayotgan pullar (qarz daftarchasi) - kelajak uchun struktura andozasi
 * direction: "berilgan" (siz qarz bergansiz) | "olingan" (siz kimgadir qarzsiz)
 */
export const FUTURE_DEBT_SCHEMA = {
  template: {
    id: "debt-sample",
    person: "Ali Valiyev",
    amount: 100000,
    currency: "UZS", // yoki "USD"
    direction: "berilgan", // "berilgan" | "olingan"
    dueDate: "2026-10-01",
    status: "kutilmoqda", // "kutilmoqda" | "qaytarildi" | "kechiktirilgan"
    notes: "Oy oxirida qaytaradi",
    createdAt: "2026-09-21T00:00:00+05:00",
  },
};

export const EXPENSE_CATEGORIES = [
  {
    id: "Qorin uchun",
    label: "Qorin uchun",
    emoji: "🍔",
    icon: "Utensils",
    color: "#f59e0b",
    subcategories: ["Ovqat", "Fast food", "Non", "Shirinlik", "Ichimlik"],
  },
  {
    id: "Transport",
    label: "Transport",
    emoji: "🚌",
    icon: "Bus",
    color: "#38bdf8",
    subcategories: ["Avtobus", "Taksi", "Metro", "Yoqilg‘i"],
  },
  {
    id: "Ta’lim",
    label: "Ta’lim",
    emoji: "📚",
    icon: "GraduationCap",
    color: "#a78bfa",
    subcategories: ["Kurs", "Kitob", "Daftar", "Kantselyariya"],
  },
  {
    id: "Texnologiya",
    label: "Texnologiya",
    emoji: "💻",
    icon: "Laptop",
    color: "#06b6d4",
    subcategories: ["Telefon", "Aksessuar", "Dastur", "Internet"],
  },
  {
    id: "Kiyim-kechak",
    label: "Kiyim-kechak",
    emoji: "👕",
    icon: "Shirt",
    color: "#ec4899",
    subcategories: ["Kiyim", "Oyoq kiyim", "Aksessuar"],
  },
  {
    id: "Uy-ro‘zg‘or",
    label: "Uy-ro‘zg‘or",
    emoji: "🏠",
    icon: "Home",
    color: "#10b981",
    subcategories: ["Uy buyumlari", "Tozalash", "Ta’mirlash"],
  },
  {
    id: "Ko‘ngilochar",
    label: "Ko‘ngilochar",
    emoji: "🎮",
    icon: "Gamepad2",
    color: "#8b5cf6",
    subcategories: ["O‘yin", "Kino", "Hordiq"],
  },
  {
    id: "Sport",
    label: "Sport",
    emoji: "💪",
    icon: "Dumbbell",
    color: "#ef4444",
    subcategories: ["Sport anjomlari", "Zal", "Mashg‘ulot"],
  },
  {
    id: "Sog‘liq",
    label: "Sog‘liq",
    emoji: "🩺",
    icon: "HeartPulse",
    color: "#14b8a6",
    subcategories: ["Dori", "Shifokor", "Gigiyena"],
  },
  {
    id: "Sovg‘alar",
    label: "Sovg‘alar",
    emoji: "🎁",
    icon: "Gift",
    color: "#f43f5e",
    subcategories: ["Sovg‘a", "Gullar", "Bayram"],
  },
  {
    id: "Do‘stlar",
    label: "Do‘stlar",
    emoji: "👥",
    icon: "Users",
    color: "#3b82f6",
    subcategories: ["Uchrashuv", "Mehmondorchilik", "Qarz / Yordam", "Boshqa"],
  },
  {
    id: "Boshqa",
    label: "Boshqa",
    emoji: "📦",
    icon: "Package",
    color: "#6b7280",
    subcategories: ["Kutilmagan", "Xizmat haqi", "Mayda-chuyda", "Boshqa"],
  },
];

export const INCOME_CATEGORIES = [
  {
    id: "Oylik maosh",
    label: "Oylik maosh",
    emoji: "💼",
    icon: "Briefcase",
    color: "#34d399",
    subcategories: ["Oylik", "Avans", "Bonus"],
  },
  {
    id: "Keshbek",
    label: "Keshbek & Bonus",
    emoji: "✨",
    icon: "Sparkles",
    color: "#fbbf24",
    subcategories: ["Bank keshbek", "Ilova bonusi"],
  },
  {
    id: "Frilans",
    label: "Frilans / Loyiha",
    emoji: "💻",
    icon: "Laptop",
    color: "#38bdf8",
    subcategories: ["Buyurtma", "Loyiha to'lovi"],
  },
  {
    id: "Sovg‘a",
    label: "Hadya & Sovg'a",
    emoji: "🎁",
    icon: "Gift",
    color: "#f472b6",
    subcategories: ["Hadya", "Mukofot"],
  },
  {
    id: "Divident",
    label: "Foyda / Divident",
    emoji: "📈",
    icon: "TrendingUp",
    color: "#a78bfa",
    subcategories: ["Investitsiya", "Foiz"],
  },
  {
    id: "Boshqa daromad",
    label: "Boshqa daromad",
    emoji: "🪙",
    icon: "Coins",
    color: "#2dd4bf",
    subcategories: ["Boshqa"],
  },
];

export const QUICK_TEMPLATES = [
  {
    label: "Flesh (10 000)",
    type: "expense",
    amount: 10000,
    quantity: 1,
    category: "Qorin uchun",
    subcategory: "Ichimlik",
    paymentMethod: "naqd",
    wallet: "naqd",
    reason: "Flesh",
    location: "Gulbahordagi Havas",
  },
  {
    label: "Tushlik (25 000)",
    type: "expense",
    amount: 25000,
    quantity: 1,
    category: "Qorin uchun",
    subcategory: "Ovqat",
    paymentMethod: "naqd",
    wallet: "naqd",
    reason: "Tushlik taomi",
    location: "Oshxona",
  },
  {
    label: "Yo'l kira (3 000)",
    type: "expense",
    amount: 3000,
    quantity: 1,
    category: "Transport",
    subcategory: "Avtobus",
    paymentMethod: "karta",
    wallet: "karta",
    reason: "Avtobus / Metro",
    location: "Transport",
  },
  {
    label: "Qahva (15 000)",
    type: "expense",
    amount: 15000,
    quantity: 1,
    category: "Qorin uchun",
    subcategory: "Ichimlik",
    paymentMethod: "karta",
    wallet: "karta",
    reason: "Qahva",
    location: "Kofe bar",
  },
  {
    label: "Keshbek (5 000)",
    type: "income",
    amount: 5000,
    quantity: 1,
    category: "Keshbek",
    subcategory: "Bank keshbek",
    paymentMethod: "karta",
    wallet: "karta",
    reason: "Bank ilovasi keshbeki",
    location: "Payme / Click",
  },
];

