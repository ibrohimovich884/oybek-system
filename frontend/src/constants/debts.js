export const DEBT_TYPES = {
  GIVEN: "given", // Men qarz berdim (Kutilayotgan tushum)
  TAKEN: "taken", // Men qarz oldim (Qaytarishim kerak bo'lgan majburiyat)
};

export const DEBT_STATUS = {
  PENDING: "pending",   // Hech narsa to'lanmagan (Kutilmoqda)
  PARTIAL: "partial",   // Qisman to'langan
  SETTLED: "settled",   // To'liq yopilgan
};

export const DEBT_TYPE_LABELS = {
  given: {
    label: "Men qarz berdim",
    shortLabel: "Berilgan",
    badge: "Kutilmoqda",
    badgeClass: "badge--info",
    color: "#38bdf8",
    personLabel: "Qarz oluvchi (Kimga berildi)",
    targetReasonLabel: "U nima uchun oldi (Sababi)",
    dueDateLabel: "Qachon qaytarishi kerak",
    walletLabel: "Qaysi hisobdan berildi",
    affectBalanceLabel: "Hisob balansidan yechilsin",
  },
  taken: {
    label: "Men qarz oldim",
    shortLabel: "Olingan",
    badge: "Qarzim",
    badgeClass: "badge--warning",
    color: "#f59e0b",
    personLabel: "Qarz beruvchi (Kimdan olindi)",
    targetReasonLabel: "Olish maqsadim (Sababi)",
    dueDateLabel: "Qachon qaytarishim kerak",
    walletLabel: "Qaysi hisobga qabul qilindi",
    affectBalanceLabel: "Hisob balansiga qo'shilsin",
  },
};

export const DEBT_STATUS_LABELS = {
  pending: {
    label: "Kutilmoqda",
    color: "var(--warning)",
    bg: "var(--warning-soft)",
    border: "var(--warning-border)",
  },
  partial: {
    label: "Qisman qaytarildi",
    color: "var(--accent)",
    bg: "var(--accent-soft)",
    border: "var(--accent-border)",
  },
  settled: {
    label: "To'liq yopildi",
    color: "var(--income)",
    bg: "var(--income-soft)",
    border: "var(--income-border)",
  },
};
