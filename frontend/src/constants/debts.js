export const DEBT_TYPES = {
  GIVEN: "given", // Men qarz berdim (Kutilayotgan tushum)
  TAKEN: "taken", // Men qarz oldim (Qaytarishim kerak bo'lgan majburiyat)
};

export const DEBT_STATUS = {
  PENDING: "pending",   // Hech narsa to'lanmagan (Kutilmoqda)
  PARTIAL: "partial",   // Qisman to'langan
  SETTLED: "settled",   // To'liq yopildi (pul to'langan)
  FORGIVEN: "forgiven", // Voz kechilgan / Kechvorilgan (pul olinmaydi, qarz nolga tushiriladi)
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
    shortLabel: "Kutilmoqda",
    color: "var(--warning)",
    bg: "var(--warning-soft)",
    border: "var(--warning-border)",
  },
  partial: {
    label: "Qisman qaytarildi",
    shortLabel: "Qisman",
    color: "var(--accent)",
    bg: "var(--accent-soft)",
    border: "var(--accent-border)",
  },
  settled: {
    label: "To'liq yopildi",
    shortLabel: "Yopildi",
    color: "var(--income)",
    bg: "var(--income-soft)",
    border: "var(--income-border)",
  },
  forgiven: {
    label: "Voz kechilgan (Kechildi)",
    shortLabel: "Voz kechilgan",
    color: "#a855f7",
    bg: "rgba(168, 85, 247, 0.15)",
    border: "rgba(168, 85, 247, 0.35)",
  },
};

export const DUE_STAGES = {
  OVERDUE: "overdue",   // O'tib ketganlar
  SOON: "soon",         // Oz qolganlar (7 kun yoki undan kam)
  UPCOMING: "upcoming", // Kelgusi (7 kundan ko'p)
  NO_DATE: "no_date",   // Muddatsiz to'lovchilar
  CLOSED: "closed",     // Yopilgan / Voz kechilgan
};

export function getDebtDueInfo(debt) {
  const isSettled = debt.status === "settled" || debt.status === "forgiven";
  if (isSettled) {
    return {
      stage: DUE_STAGES.CLOSED,
      daysLeft: null,
      isOverdue: false,
      text: debt.status === "forgiven" ? "Voz kechilgan" : "Yopilgan",
    };
  }

  if (debt.isDueDateUnknown || !debt.dueDate) {
    return {
      stage: DUE_STAGES.NO_DATE,
      daysLeft: null,
      isOverdue: false,
      text: "Muddatsiz",
    };
  }

  const dueDate = new Date(debt.dueDate);
  // Normalize date comparison to local day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dueDate);
  targetDate.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - today.getTime();
  const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const text = dueDate.toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "short",
  });

  if (daysLeft < 0) {
    return {
      stage: DUE_STAGES.OVERDUE,
      daysLeft,
      isOverdue: true,
      text: `${Math.abs(daysLeft)} kun o'tdi`,
    };
  }

  if (daysLeft <= 7) {
    return {
      stage: DUE_STAGES.SOON,
      daysLeft,
      isOverdue: false,
      text: daysLeft === 0 ? "Bugun" : `${daysLeft} kun qoldi`,
    };
  }

  return {
    stage: DUE_STAGES.UPCOMING,
    daysLeft,
    isOverdue: false,
    text,
  };
}
