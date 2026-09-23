/**
 * OYBEK SysteM - Database Sync & Offline Resiliency Engine
 * 
 * Ushbu xizmat quyidagilarni ta'minlaydi:
 * 1. Internet bo'lmaganda yoki server vaqtincha javob bermaganda
 *    barcha yangi qo'shilgan, tahrirlangan va o'chirilgan ma'lumotlarni
 *    "sync_queue" navbatida xavfsiz saqlab turadi (synced: false).
 * 2. Internet tiklanganda yoki foydalanuvchi "Qo'lda sinxronizatsiya"
 *    tugmasini bosganda navbatdagi ma'lumotlarni DBga yozadi va
 *    bazasidan eng yangi ma'lumotlarni tortib oladi (synced: true).
 * 3. Har bir ma'lumot uchun DB saqlanganlik holatini aniqlab beradi.
 */

import { apiClient } from "../api/client.js";
import { API_ENDPOINTS } from "../config/apiConfig.js";
import { generateId } from "../utils/id.js";

const STORAGE_SYNC_QUEUE_KEY = "oybek-system:sync_queue";
const STORAGE_LAST_SYNCED_KEY = "oybek-system:last_synced_at";
const STORAGE_AUTO_SYNC_KEY = "oybek-system:auto_sync_enabled";
const STORAGE_SYNC_LOGS_KEY = "oybek-system:sync_logs";

class SyncService {
  constructor() {
    this.listeners = new Set();
    this.isSyncing = false;
    this.isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    this.autoSyncTimer = null;

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true;
        this.addLog("info", "Internet tarmog'i tiklandi. Avto-sinxronizatsiya boshlanmoqda...");
        this.notify();
        if (this.isAutoSyncEnabled()) {
          this.syncNow({ forcePull: true }).catch(() => {});
        }
      });

      window.addEventListener("offline", () => {
        this.isOnline = false;
        this.addLog("warning", "Internet aloqasi uzildi. Tizim oflayn xotira rejimiga o'tdi.");
        this.notify();
      });

      // Har 45 soniyada fonda tekshirib turish
      this.autoSyncTimer = setInterval(() => {
        if (this.isOnline && this.isAutoSyncEnabled() && !this.isSyncing) {
          const queue = this.getQueue();
          if (queue.length > 0) {
            this.syncNow({ forcePull: true }).catch(() => {});
          }
        }
      }, 45000);
    }
  }

  notify() {
    const status = this.getSyncStatus();
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (err) {
        console.warn("Sync listener error:", err);
      }
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getSyncStatus());
    return () => this.listeners.delete(listener);
  }

  getQueue() {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  setQueue(queue) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_SYNC_QUEUE_KEY, JSON.stringify(queue));
      this.notify();
    } catch (err) {
      console.warn("Queue saqlashda xato:", err);
    }
  }

  addToQueue(action) {
    const queue = this.getQueue();
    const entry = {
      queueId: generateId(),
      entity: action.entity, // 'expenses' | 'wallets' | 'debts'
      type: action.type,     // 'create' | 'update' | 'delete'
      targetId: action.targetId,
      payload: action.payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(entry);
    this.setQueue(queue);
    this.addLog("info", `Xotiraga navbatga olindi: ${action.type} -> ${action.entity}`);
    return entry;
  }

  removeFromQueue(queueId) {
    const queue = this.getQueue().filter((item) => item.queueId !== queueId);
    this.setQueue(queue);
  }

  clearQueue() {
    this.setQueue([]);
    this.addLog("info", "Sinxronizatsiya navbati tozalandi");
  }

  getLastSyncedAt() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_LAST_SYNCED_KEY) || null;
  }

  setLastSyncedAt(isoString) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_LAST_SYNCED_KEY, isoString);
  }

  isAutoSyncEnabled() {
    if (typeof window === "undefined") return true;
    const val = localStorage.getItem(STORAGE_AUTO_SYNC_KEY);
    return val === null ? true : val === "true";
  }

  setAutoSyncEnabled(enabled) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_AUTO_SYNC_KEY, String(enabled));
    this.addLog("info", `Avto-sinxronizatsiya: ${enabled ? "Yoqildi" : "O'chirildi"}`);
    this.notify();
  }

  getLogs() {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_SYNC_LOGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  addLog(level, message) {
    if (typeof window === "undefined") return;
    try {
      const logs = this.getLogs();
      logs.unshift({
        id: generateId(),
        level, // 'info' | 'success' | 'warning' | 'error'
        message,
        timestamp: new Date().toISOString(),
      });
      // Faqat oxirgi 40 ta logni saqlaymiz
      const trimmed = logs.slice(0, 40);
      localStorage.setItem(STORAGE_SYNC_LOGS_KEY, JSON.stringify(trimmed));
    } catch {}
  }

  clearLogs() {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_SYNC_LOGS_KEY, JSON.stringify([]));
    this.notify();
  }

  getSyncStatus() {
    const queue = this.getQueue();
    const backendStatus = apiClient.getStatus();

    return {
      isOnline: this.isOnline,
      isConnected: backendStatus.isConnected,
      isChecking: backendStatus.isChecking,
      isSyncing: this.isSyncing,
      lastSyncedAt: this.getLastSyncedAt(),
      pendingCount: queue.length,
      pendingQueue: queue,
      autoSyncEnabled: this.isAutoSyncEnabled(),
      backendUrl: backendStatus.baseUrl,
      backendPort: backendStatus.port,
      backendError: backendStatus.error,
      latency: backendStatus.latency || null,
      logs: this.getLogs(),
    };
  }

  /**
   * Asosiy Sinxronizatsiya Jarayoni (Manual & Auto)
   */
  async syncNow(options = { forcePull: true }) {
    if (this.isSyncing) {
      return { success: false, message: "Sinxronizatsiya allaqachon bajarilmoqda..." };
    }

    this.isSyncing = true;
    this.notify();

    let pushedCount = 0;
    let pulledCount = 0;

    try {
      this.addLog("info", "Server bilan aloqa tekshirilmoqda...");
      // 1. Health check (Render cold-start uchun 12 soniya kutiladi)
      const isAlive = await apiClient.checkHealth(12000);
      if (!isAlive) {
        throw new Error("Serverga ulanib bo'lmadi. Backend uyquda yoki internet yo'q.");
      }

      // 2. Kutilayotgan navbatni (sync_queue) DBga yuborish
      const queue = this.getQueue();
      if (queue.length > 0) {
        this.addLog("info", `Navbatdagi ${queue.length} ta o'zgarish DBga yuborilmoqda...`);
        const remainingQueue = [];

        for (const item of queue) {
          try {
            if (item.entity === "expenses") {
              if (item.type === "create") {
                const res = await apiClient.post(API_ENDPOINTS.EXPENSES, item.payload);
                if (res.ok) {
                  pushedCount++;
                  this.markLocalExpenseSynced(item.payload.id, true);
                } else {
                  remainingQueue.push(item);
                }
              } else if (item.type === "update") {
                const res = await apiClient.put(API_ENDPOINTS.EXPENSE_DETAIL(item.targetId), item.payload);
                if (res.ok) {
                  pushedCount++;
                  this.markLocalExpenseSynced(item.targetId, true);
                } else {
                  remainingQueue.push(item);
                }
              } else if (item.type === "delete") {
                const res = await apiClient.delete(API_ENDPOINTS.EXPENSE_DETAIL(item.targetId));
                if (res.ok) {
                  pushedCount++;
                } else {
                  remainingQueue.push(item);
                }
              }
            } else if (item.entity === "wallets") {
              const res = await apiClient.put(API_ENDPOINTS.WALLETS, item.payload);
              if (res.ok) {
                pushedCount++;
              } else {
                remainingQueue.push(item);
              }
            } else {
              remainingQueue.push(item);
            }
          } catch (itemErr) {
            console.warn("Item sync error:", itemErr);
            remainingQueue.push(item);
          }
        }

        this.setQueue(remainingQueue);
      }

      // 3. DBdan eng so'nggi ma'lumotlarni tortib olish va xotirani yangilash (Pull)
      if (options.forcePull) {
        this.addLog("info", "Serverdan yangi ma'lumotlar tortib olinmoqda (Pull)...");

        // A) Tranzaksiyalarni olish
        const expRes = await apiClient.get(API_ENDPOINTS.EXPENSES);
        if (expRes.ok && Array.isArray(expRes.data)) {
          pulledCount = expRes.data.length;
          this.mergeServerExpensesWithLocal(expRes.data);
        }

        // B) Hamyonlarni olish
        const walletRes = await apiClient.get(API_ENDPOINTS.WALLETS);
        if (walletRes.ok && walletRes.data) {
          localStorage.setItem("oybek-system:wallets", JSON.stringify(walletRes.data));
        }
      }

      const nowIso = new Date().toISOString();
      this.setLastSyncedAt(nowIso);
      this.addLog(
        "success",
        `Muvaffaqiyatli sinxronlandi! ${pushedCount} ta o'zgarish DBga yozildi, ${pulledCount} ta ma'lumot DBdan yangilandi.`
      );

      // UI kontekstini yangilash uchun hodisa yuboramiz
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oybek:sync-complete", {
          detail: { pushedCount, pulledCount, timestamp: nowIso },
        }));
      }

      return {
        success: true,
        pushedCount,
        pulledCount,
        message: `Sinxronizatsiya muvaffaqiyatli! ${pushedCount} ta yuborildi, ${pulledCount} ta yangilandi.`,
      };
    } catch (err) {
      const errMsg = err.message || "Sinxronizatsiyada xatolik yuz berdi";
      this.addLog("error", `Sinxronizatsiya xatosi: ${errMsg}`);
      return {
        success: false,
        error: errMsg,
        message: errMsg,
      };
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  /**
   * Mahalliy ro'yxatdagi tranzaksiyani "synced: true" deb belgilash
   */
  markLocalExpenseSynced(id, isSynced = true) {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("oybek-system:expenses");
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;

      const updated = list.map((item) => {
        if (item.id === id) {
          return { ...item, synced: isSynced };
        }
        return item;
      });
      localStorage.setItem("oybek-system:expenses", JSON.stringify(updated));
    } catch {}
  }

  /**
   * DBdan kelgan ma'lumotlarni lokal kesh bilan aqlli birlashtirish
   * (Faqat xotirada saqlanib, hali DBga yuborilmagan unsynced ma'lumotlar o'chib ketmasligi uchun)
   */
  mergeServerExpensesWithLocal(serverExpenses) {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("oybek-system:expenses");
      const localList = raw ? JSON.parse(raw) : [];

      // Lokal ro'yxatdagi hali sinxronlanmaganlarni ajratib olamiz
      const unsyncedLocals = Array.isArray(localList)
        ? localList.filter((item) => item.synced === false)
        : [];

      // Serverdan kelgan barcha yozuvlarni synced: true deb belgilaymiz
      const serverWithSync = serverExpenses.map((item) => ({
        ...item,
        synced: true,
      }));

      // Birlashtirish: unsynced elementlar tepada qoladi, server elementlari bilan to'ldiriladi
      const mergedMap = new Map();
      // Avval serverdagilarni joylaymiz
      serverWithSync.forEach((item) => mergedMap.set(item.id, item));
      // Hali sinxronlanmagan lokal elementlarni ustiga qo'yamiz (ular ustun turadi)
      unsyncedLocals.forEach((item) => mergedMap.set(item.id, item));

      const mergedList = Array.from(mergedMap.values());
      // Sanaga qarab saralash (eng yangisi tepada)
      mergedList.sort((a, b) => new Date(b.spentAt || b.createdAt) - new Date(a.spentAt || a.createdAt));

      localStorage.setItem("oybek-system:expenses", JSON.stringify(mergedList));
    } catch (err) {
      console.warn("Birlashtirishda xato:", err);
    }
  }

  /**
   * Barcha mahalliy ma'lumotlarni majburiy DBga yuborish (Push All)
   */
  async forcePushAllToDB() {
    this.isSyncing = true;
    this.notify();

    try {
      this.addLog("info", "Barcha mahalliy ma'lumotlarni DBga yuklash boshlandi...");
      const rawExpenses = localStorage.getItem("oybek-system:expenses");
      const expenses = rawExpenses ? JSON.parse(rawExpenses) : [];
      const rawWallets = localStorage.getItem("oybek-system:wallets");
      const wallets = rawWallets ? JSON.parse(rawWallets) : {};
      const rawReserves = localStorage.getItem("oybek-system:reserves");
      const reserves = rawReserves ? JSON.parse(rawReserves) : {};
      const rawDebts = localStorage.getItem("oybek-system:pending_debts");
      const debts = rawDebts ? JSON.parse(rawDebts) : [];

      // 1. Zaxira endpointi orqali yuborish
      const backupPayload = {
        exportedAt: new Date().toISOString(),
        wallets,
        reserves,
        pendingDebts: debts,
        expenses,
      };

      const backupRes = await apiClient.post(API_ENDPOINTS.BACKUP, backupPayload);

      // 2. Har bir expense uchun tekshirib DBga jo'natish
      let count = 0;
      for (const item of expenses) {
        if (!item.synced) {
          const res = await apiClient.post(API_ENDPOINTS.EXPENSES, item);
          if (res.ok) count++;
        }
      }

      // Hammasini synced: true deb belgilash
      const allSynced = expenses.map((item) => ({ ...item, synced: true }));
      localStorage.setItem("oybek-system:expenses", JSON.stringify(allSynced));
      this.clearQueue();

      const nowIso = new Date().toISOString();
      this.setLastSyncedAt(nowIso);
      this.addLog("success", `Barcha ma'lumotlar (${expenses.length} ta yozuv) DBga muvaffaqiyatli saqlandi!`);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oybek:sync-complete", { detail: { count, timestamp: nowIso } }));
      }

      return { success: true, count: expenses.length };
    } catch (err) {
      this.addLog("error", `Majburiy yuklashda xato: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }
}

export const syncService = new SyncService();
