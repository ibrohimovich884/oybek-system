import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useExpenses } from "./ExpensesContext.jsx";
import { formatSum } from "../utils/format.js";
import { generateId } from "../utils/id.js";

const NotificationsContext = createContext(null);

const STORAGE_CUSTOM_NOTIFICATIONS_KEY = "oybek_custom_notifications_v1";
const STORAGE_READ_IDS_KEY = "oybek_read_notifications_v1";
const STORAGE_DISMISSED_SYSTEM_IDS_KEY = "oybek_dismissed_system_notifs_v1";
const STORAGE_SETTINGS_KEY = "oybek_notification_settings_v1";

const DEFAULT_SETTINGS = {
  soundEnabled: true,
  browserPushEnabled: false,
  autoRemindersEnabled: true,
  debtAlertsEnabled: true,
  balanceAlertsEnabled: true,
  syncAlertsEnabled: true,
  rateAlertsEnabled: true,
  lowBalanceThresholdUZS: 50000,
};

// Yengil Web Audio API ovoz effekti (hech qanday tashqi audio faylga bog'liq emas)
const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Brauzer ovoz cheklovlari bo'lsa xatolikni tinch yutamiz
  }
};

export function NotificationsProvider({ children }) {
  const { debts, currentBalances, syncStatus, rateInfo } = useExpenses();

  // Foydalanuvchi kiritgan shaxsiy eslatmalar
  const [customNotifications, setCustomNotifications] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_CUSTOM_NOTIFICATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // O'qilgan bildirishnomalar IDlari to'plami
  const [readIds, setReadIds] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_READ_IDS_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Foydalanuvchi yashirgan / o'chirgan tizim bildirishnomalari IDlari
  const [dismissedSystemIds, setDismissedSystemIds] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_DISMISSED_SYSTEM_IDS_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Bildirishnoma sozlamalari
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Brauzer bildirishnoma ruxsati holati
  const [browserPermission, setBrowserPermission] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });

  // Shaxsiy bildirishnomalarni saqlash
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_CUSTOM_NOTIFICATIONS_KEY,
        JSON.stringify(customNotifications)
      );
    } catch (e) {
      console.warn("Custom bildirishnomalarni saqlashda xatolik:", e);
    }
  }, [customNotifications]);

  // O'qilgan IDlarni saqlash
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_READ_IDS_KEY,
        JSON.stringify(Array.from(readIds))
      );
    } catch (e) {
      console.warn("Read IDlarni saqlashda xatolik:", e);
    }
  }, [readIds]);

  // Yashirilgan tizim IDlarni saqlash
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_DISMISSED_SYSTEM_IDS_KEY,
        JSON.stringify(Array.from(dismissedSystemIds))
      );
    } catch (e) {
      console.warn("Dismissed IDlarni saqlashda xatolik:", e);
    }
  }, [dismissedSystemIds]);

  // Sozlamalarni saqlash
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn("Sozlamalarni saqlashda xatolik:", e);
    }
  }, [settings]);

  // Avtomatik tizim va moliya bildirishnomalarini hisoblash
  const systemNotifications = useMemo(() => {
    if (!settings.autoRemindersEnabled) return [];

    const generated = [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // 1. Qarzlar bo'yicha tahlil (Debt Alerts)
    if (settings.debtAlertsEnabled && debts && debts.length > 0) {
      debts.forEach((debt) => {
        if (debt.status === "settled") return;

        const amountNum = Number(debt.amount || 0);
        const paidNum = Number(debt.paidAmount || 0);
        const remaining = amountNum - paidNum;
        if (remaining <= 0) return;

        const isGiven = debt.type === "given";
        const personName = debt.personName || "Noma'lum shaxs";
        const currency = debt.currency || "UZS";
        const amountDisplay =
          currency === "USD" ? `$${remaining}` : `${formatSum(remaining)} so'm`;

        // Muddati belgilangan qarzlar
        if (debt.dueDate) {
          const dueDateObj = new Date(debt.dueDate);
          const diffDays = Math.ceil((dueDateObj - now) / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            // Muddati o'tgan
            generated.push({
              id: `sys-debt-overdue-${debt.id}`,
              isSystem: true,
              type: "debt",
              priority: "high",
              title: isGiven ? "Qarz muddati o'tgan!" : "Qarz to'lov muddati o'tdi!",
              message: isGiven
                ? `${personName} sizdan olgan ${amountDisplay} qarzni qaytarish muddati ${Math.abs(
                    diffDays
                  )} kun oldin o'tgan.`
                : `${personName}ga berishingiz kerak bo'lgan ${amountDisplay} qarz muddati ${Math.abs(
                    diffDays
                  )} kun oldin o'tgan.`,
              actionUrl: "/debts",
              actionLabel: "Qarz daftariga o'tish",
              createdAt: debt.dueDate || debt.createdAt || now.toISOString(),
              dueDate: debt.dueDate,
              meta: { debtId: debt.id, remaining, personName },
            });
          } else if (diffDays <= 3) {
            // Yaqinlashmoqda (0-3 kun)
            const dayText =
              diffDays === 0
                ? "Bugun oxirgi muddat!"
                : diffDays === 1
                ? "Ertaga oxirgi muddat"
                : `${diffDays} kundan keyin muddat keladi`;

            generated.push({
              id: `sys-debt-upcoming-${debt.id}`,
              isSystem: true,
              type: "debt",
              priority: diffDays === 0 ? "high" : "normal",
              title: isGiven ? `Qarz qaytish vaqti yaqinlashdi (${dayText})` : `Qarz to'lash vaqti yaqinlashdi (${dayText})`,
              message: isGiven
                ? `${personName} bilan hisob-kitob qilish vaqti keldi (${amountDisplay}).`
                : `${personName}ga ${amountDisplay} qarzni qaytarish vaqti keldi.`,
              actionUrl: "/debts",
              actionLabel: "Qarzni tekshirish",
              createdAt: debt.dueDate || now.toISOString(),
              dueDate: debt.dueDate,
              meta: { debtId: debt.id, remaining, personName },
            });
          }
        } else if (remaining > 500000 && !debt.dueDate) {
          // Muddati yo'q, lekin katta summa kutilmoqda
          generated.push({
            id: `sys-debt-pending-large-${debt.id}`,
            isSystem: true,
            type: "debt",
            priority: "low",
            title: isGiven ? `Kutilayotgan qarz: ${personName}` : `To'lanmagan qarz: ${personName}`,
            message: `${personName} bilan ${amountDisplay} miqdoridagi qarz holati hali to'liq yopilmagan.`,
            actionUrl: "/debts",
            actionLabel: "Qarz tafsilotlari",
            createdAt: debt.createdAt || now.toISOString(),
            meta: { debtId: debt.id, remaining, personName },
          });
        }
      });
    }

    // 2. Balans va Moliya ogohlantirishlari (Balance Alerts)
    if (settings.balanceAlertsEnabled && currentBalances) {
      const threshold = Number(settings.lowBalanceThresholdUZS) || 50000;

      // Karta yoki Naqd pastligi
      if (currentBalances.karta !== undefined && currentBalances.karta < threshold && currentBalances.karta >= 0) {
        generated.push({
          id: `sys-balance-karta-low-${todayStr}`,
          isSystem: true,
          type: "finance",
          priority: "normal",
          title: "Karta balansi kam qoldi",
          message: `Karta hisobingizda faqat ${formatSum(
            currentBalances.karta
          )} so'm qoldi. Zarur xarajatlar uchun hisobni to'ldirib oling.`,
          actionUrl: "/money",
          actionLabel: "Balanslarni ko'rish",
          createdAt: now.toISOString(),
        });
      } else if (currentBalances.karta !== undefined && currentBalances.karta < 0) {
        generated.push({
          id: `sys-balance-karta-negative-${todayStr}`,
          isSystem: true,
          type: "finance",
          priority: "high",
          title: "Karta balansi manfiy!",
          message: `Karta balansingiz manfiy holatda (${formatSum(
            currentBalances.karta
          )} so'm). Iltimos, o'tkazma yoki kirim kiriting.`,
          actionUrl: "/money",
          actionLabel: "Tuzatish",
          createdAt: now.toISOString(),
        });
      }

      if (currentBalances.naqd !== undefined && currentBalances.naqd < threshold && currentBalances.naqd >= 0) {
        generated.push({
          id: `sys-balance-naqd-low-${todayStr}`,
          isSystem: true,
          type: "finance",
          priority: "low",
          title: "Naqd pul kam qoldi",
          message: `Naqd hamyoningizda ${formatSum(currentBalances.naqd)} so'm mavjud.`,
          actionUrl: "/money",
          actionLabel: "Balanslarni ko'rish",
          createdAt: now.toISOString(),
        });
      }

      // Xarajat daromaddan yuqori bo'lsa
      if (
        currentBalances.totalIncomeUZS > 0 &&
        currentBalances.totalExpenseUZS > currentBalances.totalIncomeUZS * 1.5
      ) {
        generated.push({
          id: `sys-finance-expense-high-${todayStr}`,
          isSystem: true,
          type: "finance",
          priority: "normal",
          title: "Xarajatlar oqimi yuqori",
          message: `Jami xarajat (${formatSum(
            currentBalances.totalExpenseUZS
          )} so'm) tushumdan sezilarli darajada oshib ketdi.`,
          actionUrl: "/money",
          actionLabel: "Tahlilni ko'rish",
          createdAt: now.toISOString(),
        });
      }
    }

    // 3. Valyuta kursi bildirishnomasi (Dollar Rate)
    if (settings.rateAlertsEnabled && rateInfo?.rate) {
      generated.push({
        id: `sys-rate-cbu-${todayStr}`,
        isSystem: true,
        type: "system",
        priority: "low",
        title: "Markaziy Bank USD kursi",
        message: `Bugungi rasmiy dollar kursi: 1 USD = ${formatSum(rateInfo.rate)} so'm (${rateInfo.date || todayStr}).`,
        actionUrl: "/control",
        actionLabel: "Boshqaruv paneliga o'tish",
        createdAt: now.toISOString(),
      });
    }

    // 4. Sinxronizatsiya va Oflayn holat (Sync & DB Alerts)
    if (settings.syncAlertsEnabled && syncStatus) {
      if (syncStatus.pendingCount > 0) {
        generated.push({
          id: `sys-sync-pending-${todayStr}`,
          isSystem: true,
          type: "system",
          priority: "normal",
          title: "Sinxronlanmagan ma'lumotlar bor",
          message: `${syncStatus.pendingCount} ta amal server bazasiga yuklanishi kutilmoqda. Internet mavjud bo'lganda sinxronlashni unutmang.`,
          actionUrl: "/settings",
          actionLabel: "Sinxronlash sahifasi",
          createdAt: now.toISOString(),
        });
      }
      if (!syncStatus.isConnected && !syncStatus.isSyncing) {
        generated.push({
          id: `sys-sync-offline-${todayStr}`,
          isSystem: true,
          type: "system",
          priority: "low",
          title: "Ilova oflayn rejimida",
          message: "Ma'lumotlar lokal brauzer xotirasida xavfsiz saqlanmoqda. Aloqa tiklangach DB bilan yangilanadi.",
          actionUrl: "/settings",
          actionLabel: "Holatni tekshirish",
          createdAt: now.toISOString(),
        });
      }
    }

    // Foydalanuvchi o'chirgan / yashirgan tizim bildirishnomalarini olib tashlaymiz
    return generated.filter((item) => !dismissedSystemIds.has(item.id));
  }, [debts, currentBalances, syncStatus, rateInfo, settings, dismissedSystemIds]);

  // Barcha bildirishnomalarni birlashtirish va tartiblash
  const notifications = useMemo(() => {
    const combined = [
      ...systemNotifications.map((n) => ({
        ...n,
        isRead: readIds.has(n.id),
      })),
      ...customNotifications.map((n) => ({
        ...n,
        isRead: readIds.has(n.id) || !!n.isRead,
      })),
    ];

    // Tartiblash: 1) O'qilmaganlar oldinda, 2) Prioritet (high > normal > low), 3) Sana (eng yangi oldinda)
    const priorityWeight = { high: 3, normal: 2, low: 1 };

    return combined.sort((a, b) => {
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      const weightA = priorityWeight[a.priority] || 2;
      const weightB = priorityWeight[b.priority] || 2;
      if (weightA !== weightB) {
        return weightB - weightA;
      }
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [systemNotifications, customNotifications, readIds]);

  // O'qilmagan bildirishnomalar soni
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Yangi shaxsiy bildirishnoma / eslatma qo'shish
  const addNotification = useCallback(
    (payload) => {
      const newNotif = {
        id: generateId("notif"),
        title: payload.title?.trim() || "Yangi eslatma",
        message: payload.message?.trim() || "",
        type: payload.type || "custom", // 'custom' | 'debt' | 'finance' | 'exercise' | 'system'
        priority: payload.priority || "normal", // 'high' | 'normal' | 'low'
        actionUrl: payload.actionUrl || null,
        actionLabel: payload.actionLabel || null,
        dueDate: payload.dueDate || null,
        createdAt: new Date().toISOString(),
        isRead: false,
        isCustom: true,
      };

      setCustomNotifications((prev) => [newNotif, ...prev]);

      // Ovoz chiqarish
      if (settings.soundEnabled) {
        playNotificationSound();
      }

      // Agar brauzer bildirishnomasi yoqilgan bo'lsa
      if (
        settings.browserPushEnabled &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(newNotif.title, {
            body: newNotif.message || "OYBEK SysteM bildirishnomasi",
            icon: "/pwa-192x192.png",
          });
        } catch (e) {
          console.warn("Browser notification xatosi:", e);
        }
      }

      return newNotif;
    },
    [settings]
  );

  // Bitta bildirishnomani o'qilgan deb belgilash
  const markAsRead = useCallback((id) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // Barcha bildirishnomalarni o'qilgan deb belgilash
  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      return next;
    });
  }, [notifications]);

  // Bitta bildirishnomani o'qilmagan deb belgilash
  const markAsUnread = useCallback((id) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Bildirishnomani o'chirish / bekor qilish
  const deleteNotification = useCallback((id) => {
    // Agar bu tizim bildirishnomasi bo'lsa
    if (id.startsWith("sys-")) {
      setDismissedSystemIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    } else {
      // Shaxsiy bildirishnoma bo'lsa
      setCustomNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  }, []);

  // Barcha o'qilgan bildirishnomalarni tozalash
  const clearReadNotifications = useCallback(() => {
    const readSysIds = notifications
      .filter((n) => n.isRead && n.id.startsWith("sys-"))
      .map((n) => n.id);

    setDismissedSystemIds((prev) => {
      const next = new Set(prev);
      readSysIds.forEach((id) => next.add(id));
      return next;
    });

    setCustomNotifications((prev) => prev.filter((n) => !readIds.has(n.id)));
  }, [notifications, readIds]);

  // Barcha yashirilgan tizim bildirishnomalarini qayta tiklash
  const resetDismissedSystemNotifications = useCallback(() => {
    setDismissedSystemIds(new Set());
    setReadIds(new Set());
  }, []);

  // Sozlamalarni yangilash
  const updateSettings = useCallback((partial) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  // Brauzer bildirishnomalari ruxsatini so'rash
  const requestBrowserPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      if (permission === "granted") {
        updateSettings({ browserPushEnabled: true });
        new Notification("OYBEK SysteM", {
          body: "Bildirishnomalar muvaffaqiyatli yoqildi!",
          icon: "/pwa-192x192.png",
        });
      }
      return permission;
    } catch (e) {
      console.warn("Notification permission xatosi:", e);
      return "denied";
    }
  }, [updateSettings]);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    markAsUnread,
    deleteNotification,
    clearReadNotifications,
    resetDismissedSystemNotifications,
    settings,
    updateSettings,
    browserPermission,
    requestBrowserPermission,
    playNotificationSound,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications NotificationsProvider ichida ishlatilishi kerak");
  }
  return ctx;
}
