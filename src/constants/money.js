export const DEFAULT_WALLETS = {
  naqd: 30000,
  karta: 100000,
};

export const WALLET_CONFIG = {
  naqd: {
    id: "naqd",
    label: "Naqd pul",
    shortLabel: "Naqd",
    icon: "Wallet",
    color: "#eab308",
  },
  karta: {
    id: "karta",
    label: "Plastik karta",
    shortLabel: "Karta",
    icon: "CreditCard",
    color: "#38bdf8",
  },
};

export const EXPENSE_CATEGORIES = [
  { id: "food", label: "Oziq-ovqat", icon: "Utensils", color: "#f59e0b" },
  { id: "transport", label: "Transport & Yo'l", icon: "Car", color: "#38bdf8" },
  { id: "cafe", label: "Kafe & Choyxona", icon: "Coffee", color: "#fb7185" },
  { id: "shopping", label: "Xaridlar & Kiyim", icon: "ShoppingBag", color: "#c084fc" },
  { id: "housing", label: "Kommunal & Uy", icon: "Home", color: "#34d399" },
  { id: "education", label: "Ta'lim & Kitob", icon: "GraduationCap", color: "#22d3ee" },
  { id: "health", label: "Salomatlik & Dori", icon: "HeartPulse", color: "#f87171" },
  { id: "entertainment", label: "Ko'ngilochar & Dam", icon: "Gamepad2", color: "#fbbf24" },
  { id: "other_expense", label: "Boshqa xarajat", icon: "Package", color: "#9ca3af" },
];

export const INCOME_CATEGORIES = [
  { id: "salary", label: "Oylik maosh", icon: "Briefcase", color: "#34d399" },
  { id: "cashback", label: "Keshbek & Bonus", icon: "Sparkles", color: "#fbbf24" },
  { id: "freelance", label: "Frilans / Loyiha", icon: "Laptop", color: "#38bdf8" },
  { id: "gift", label: "Hadya & Sovg'a", icon: "Gift", color: "#f472b6" },
  { id: "investment", label: "Foyda / Divident", icon: "TrendingUp", color: "#a78bfa" },
  { id: "other_income", label: "Boshqa daromad", icon: "Coins", color: "#2dd4bf" },
];

export const QUICK_TEMPLATES = [
  {
    label: "Tushlik (25 000)",
    type: "expense",
    amount: 25000,
    category: "food",
    wallet: "naqd",
    reason: "Tushlik taomi",
  },
  {
    label: "Yo'l kira (3 000)",
    type: "expense",
    amount: 3000,
    category: "transport",
    wallet: "karta",
    reason: "Avtobus / Metro",
  },
  {
    label: "Qahva (15 000)",
    type: "expense",
    amount: 15000,
    category: "cafe",
    wallet: "karta",
    reason: "Qahva",
  },
  {
    label: "Bozorlik (50 000)",
    type: "expense",
    amount: 50000,
    category: "food",
    wallet: "naqd",
    reason: "Oziq-ovqat mahsulotlari",
  },
  {
    label: "Keshbek (5 000)",
    type: "income",
    amount: 5000,
    category: "cashback",
    wallet: "karta",
    reason: "Bank ilovasi keshbeki",
  },
];
