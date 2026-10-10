/**
 * OYBEK SysteM - Database Sync & Offline Resiliency Engine
 * 
 * Ushbu xizmat quyidagilarni ta'minlaydi:
 * 1. Barcha jadvallar (wallets, transactions, transaction_edits, debts, debt_payments,
 *    cbu_rate_log, exercises, exercise_logs) uchun oflayn navbat (sync_queue).
 * 2. Internet tiklanganda yoki foydalanuvchi "Qo'lda sinxronizatsiya"
 *    tugmasini bosganda navbatdagi ma'lumotlarni DBga yozadi va
 *    bazasidan eng yangi ma'lumotlarni tortib oladi (Pull).
 * 3. Backendni asosiy manba (Source of Truth) sifatida ishlatadi.
 */

import { apiClient } from "../api/client.js";
import { API_ENDPOINTS } from "../config/apiConfig.js";
import { generateId } from "../utils/id.js";
import { getUserStorageKey, clearAllUserData } from "../utils/storageKeys.js";
import { isCbuRateFresh } from "./exchangeRateService.js";

const BASE_SYNC_QUEUE_KEY = "oybek-system:sync_queue";
const BASE_LAST_SYNCED_KEY = "oybek-system:last_synced_at";
const BASE_AUTO_SYNC_KEY = "oybek-system:auto_sync_enabled";
const BASE_SYNC_LOGS_KEY = "oybek-system:sync_logs";

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
      const raw = localStorage.getItem(getUserStorageKey(BASE_SYNC_QUEUE_KEY));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  setQueue(queue) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(getUserStorageKey(BASE_SYNC_QUEUE_KEY), JSON.stringify(queue));
      this.notify();
    } catch (err) {
      console.warn("Queue saqlashda xato:", err);
    }
  }

  /**
   * Navbatga har qanday jadval amalni qo'shish
   * entity: 'expenses' | 'wallets' | 'debts' | 'reserves' | 'dollar_rate_history' | 'exercises' | 'exercise_logs' | 'exchange_rate'
   */
  addToQueue(action) {
    const queue = this.getQueue();
    const entry = {
      queueId: generateId(),
      entity: action.entity,
      type: action.type, // 'create' | 'update' | 'delete'
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
    return localStorage.getItem(getUserStorageKey(BASE_LAST_SYNCED_KEY)) || null;
  }

  setLastSyncedAt(isoString) {
    if (typeof window === "undefined") return;
    localStorage.setItem(getUserStorageKey(BASE_LAST_SYNCED_KEY), isoString);
  }

  isAutoSyncEnabled() {
    if (typeof window === "undefined") return true;
    const val = localStorage.getItem(getUserStorageKey(BASE_AUTO_SYNC_KEY));
    return val === null ? true : val === "true";
  }

  setAutoSyncEnabled(enabled) {
    if (typeof window === "undefined") return;
    localStorage.setItem(getUserStorageKey(BASE_AUTO_SYNC_KEY), String(enabled));
    this.addLog("info", `Avto-sinxronizatsiya: ${enabled ? "Yoqildi" : "O'chirildi"}`);
    this.notify();
  }

  getLogs() {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(getUserStorageKey(BASE_SYNC_LOGS_KEY));
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
      const trimmed = logs.slice(0, 40);
      localStorage.setItem(getUserStorageKey(BASE_SYNC_LOGS_KEY), JSON.stringify(trimmed));
    } catch {}
  }

  clearLogs() {
    if (typeof window === "undefined") return;
    localStorage.setItem(getUserStorageKey(BASE_SYNC_LOGS_KEY), JSON.stringify([]));
    this.notify();
  }

  /**
   * Brauzerdagi barcha lokal xotirani (localStorage) tozalash
   */
  clearAllStorage({ preserveBackendConfig = true } = {}) {
    clearAllUserData({ preserveBackendConfig });
    this.notify();
    return { success: true };
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
   * Asosiy Sinxronizatsiya Jarayoni (Barcha jadvallar bo'yicha Push & Pull)
   */
  async syncNow(options = { forcePull: true }) {
    if (this.isSyncing) {
      return { success: false, message: "Sinxronizatsiya allaqachon bajarilmoqda..." };
    }

    this.isSyncing = true;
    this.notify();

    let pushedCount = 0;
    let pulledCount = 0;
    let failedCount = 0;
    let lastFailure = null;

    try {
      this.addLog("info", "Server bilan aloqa tekshirilmoqda...");
      const isAlive = await apiClient.checkHealth(45000);
      if (!isAlive) {
        throw new Error("Serverga ulanib bo'lmadi. Backend faol emas yoki internet yo'q.");
      }

      // 1. Kutilayotgan navbatni (sync_queue) tegishli DB jadvallariga yuborish (PUSH)
      const queue = this.getQueue();
      if (queue.length > 0) {
        this.addLog("info", `Navbatdagi ${queue.length} ta o'zgarish DBga yuborilmoqda...`);
        const remainingQueue = [];
        const failures = [];
        const fail = (item, res) => {
          remainingQueue.push(item);
          failures.push(res?.error || "noma'lum xato");
        };

        for (const item of queue) {
          try {
            let res = null;

            // A) Tranzaksiyalar (transactions & transaction_edits jadvallari)
            if (item.entity === "expenses") {
              if (item.type === "create") {
                res = await apiClient.post(API_ENDPOINTS.EXPENSES, item.payload);
                if (res.ok) this.markLocalExpenseSynced(item.payload.id, true);
              } else if (item.type === "update") {
                res = await apiClient.put(API_ENDPOINTS.EXPENSE_DETAIL(item.targetId), item.payload);
                if (res.ok) this.markLocalExpenseSynced(item.targetId, true);
              } else if (item.type === "delete") {
                res = await apiClient.delete(API_ENDPOINTS.EXPENSE_DETAIL(item.targetId));
              }
            }
            // B) Hamyonlar (wallets jadvali)
            else if (item.entity === "wallets") {
              res = await apiClient.put(API_ENDPOINTS.WALLETS, item.payload);
            }
            // C) Qarzlar (debts & debt_payments jadvallari)
            else if (item.entity === "debts") {
              if (item.type === "create") {
                res = await apiClient.post(API_ENDPOINTS.DEBTS, item.payload);
              } else if (item.type === "update") {
                res = await apiClient.put(API_ENDPOINTS.DEBT_DETAIL(item.targetId), item.payload);
              } else if (item.type === "delete") {
                res = await apiClient.delete(API_ENDPOINTS.DEBT_DETAIL(item.targetId));
              }
              if (res?.ok && item.targetId) {
                this.markLocalDebtSynced(item.targetId, true);
              }
            }
            // D) Zaxira hisoblari (wallets & notes)
            else if (item.entity === "reserves") {
              if (item.payload?.id && item.payload?.amount !== undefined) {
                res = await apiClient.put(API_ENDPOINTS.WALLETS, { [item.payload.id]: item.payload.amount });
                if (item.payload.noteText) {
                  await apiClient.post(`${API_ENDPOINTS.WALLETS}/${item.payload.id}/notes`, {
                    text: item.payload.noteText,
                    amountAtTime: item.payload.amount,
                  }).catch(() => {});
                }
              }
            }
            // D) Mashqlar (exercises jadvali)
            else if (item.entity === "exercises") {
              if (item.type === "create") {
                res = await apiClient.post(API_ENDPOINTS.EXERCISES, item.payload);
                if (res.ok) this.markLocalExerciseSynced(item.payload.id, true);
              } else if (item.type === "delete") {
                res = await apiClient.delete(`${API_ENDPOINTS.EXERCISES}/${encodeURIComponent(item.targetId)}`);
              }
            }
            // E) Mashq jurnali (exercise_logs jadvali)
            else if (item.entity === "exercise_logs") {
              res = await apiClient.post(API_ENDPOINTS.EXERCISE_LOGS, item.payload);
            }
            // F) Markaziy bank valyuta kursi (cbu_rate_log jadvali)
            else if (item.entity === "exchange_rate") {
              if (item.payload?.rate) {
                res = await apiClient.post(API_ENDPOINTS.EXCHANGE_RATE_LOG, item.payload);
              } else {
                res = await apiClient.post(API_ENDPOINTS.EXCHANGE_RATE_SYNC_CBU, {});
              }
            }

            if (res && res.ok) pushedCount++;
            else fail(item, res);
          } catch (itemErr) {
            console.warn("Item sync error:", itemErr);
            fail(item, { error: itemErr.message });
          }
        }

        if (failures.length > 0) {
          failedCount = failures.length;
          lastFailure = failures[0];
        }
        this.setQueue(remainingQueue);
      }

      // 2. DBdan barcha jadvallar bo'yicha eng so'nggi ma'lumotlarni tortib olish (PULL)
      if (options.forcePull) {
        this.addLog("info", "Server DBdan barcha yangi ma'lumotlar tortib olinmoqda (Pull)...");

        // A) Tranzaksiyalar (transactions & transaction_edits)
        const expRes = await apiClient.get(API_ENDPOINTS.EXPENSES);
        if (expRes.ok && Array.isArray(expRes.data)) {
          pulledCount += expRes.data.length;
          this.mergeServerExpensesWithLocal(expRes.data);
        }

        // B) Hamyonlar (wallets)
        const walletRes = await apiClient.get(API_ENDPOINTS.WALLETS);
        if (walletRes.ok && walletRes.data) {
          pulledCount += Object.keys(walletRes.data).length;
          localStorage.setItem(getUserStorageKey("oybek-system:wallets"), JSON.stringify(walletRes.data));
        }

        // C) Qarzlar (debts & debt_payments)
        const debtRes = await apiClient.get(API_ENDPOINTS.DEBTS);
        if (debtRes.ok && Array.isArray(debtRes.data)) {
          pulledCount += debtRes.data.length;
          this.mergeServerDebtsWithLocal(debtRes.data);
        }

        // D) Mashqlar (exercises)
        const exRes = await apiClient.get(API_ENDPOINTS.EXERCISES);
        if (exRes.ok && Array.isArray(exRes.data)) {
          pulledCount += exRes.data.length;
          this.mergeServerExercisesWithLocal(exRes.data);
        }

        // E) Mashq jurnali (exercise_logs)
        const logsRes = await apiClient.get(API_ENDPOINTS.EXERCISE_LOGS);
        if (logsRes.ok && Array.isArray(logsRes.data)) {
          pulledCount += logsRes.data.length;
          this.mergeServerLogsWithLocal(logsRes.data);
        }

        // F) CBU kursi yangilash va cbu_rate_log ga yozish (Kuniga 1 marta yangilanadi)
        if (!isCbuRateFresh()) {
          const cbuRes = await apiClient.post(API_ENDPOINTS.EXCHANGE_RATE_SYNC_CBU, {}).catch(() => null);
          if (cbuRes && cbuRes.ok && cbuRes.data?.rate) {
            localStorage.setItem(getUserStorageKey("oybek-system:usd_rate"), String(cbuRes.data.rate));
            const meta = {
              date: new Date().toLocaleDateString("uz-UZ"),
              diff: "0.00",
              lastSuccess: new Date().toISOString(),
            };
            localStorage.setItem(getUserStorageKey("oybek-system:usd_rate_meta"), JSON.stringify(meta));
          }
        }
      }

      if (failedCount > 0) {
        const msg = `${failedCount} ta o'zgarish DBga yozilmadi. Server xatosi: ${lastFailure}`;
        this.addLog("error", msg);
        return { success: false, pushedCount, pulledCount, failedCount, error: msg, message: msg };
      }

      const nowIso = new Date().toISOString();
      this.setLastSyncedAt(nowIso);
      this.addLog(
        "success",
        `Muvaffaqiyatli sinxronlandi! ${pushedCount} ta o'zgarish DBga yozildi, ${pulledCount} ta ma'lumot DBdan yangilandi.`
      );

      // UI kontekstlarini yangilash uchun hodisa
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("oybek:sync-complete", {
            detail: { pushedCount, pulledCount, timestamp: nowIso },
          })
        );
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

  markLocalExpenseSynced(id, isSynced = true) {
    if (typeof window === "undefined") return;
    try {
      const storageKey = getUserStorageKey("oybek-system:expenses");
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      const updated = list.map((item) => (item.id === id ? { ...item, synced: isSynced } : item));
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  }

  markLocalDebtSynced(id, isSynced = true) {
    if (typeof window === "undefined") return;
    try {
      const storageKey = getUserStorageKey("oybek-system:pending_debts");
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      const updated = list.map((item) => (item.id === id ? { ...item, synced: isSynced } : item));
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  }

  markLocalExerciseSynced(id, isSynced = true) {
    if (typeof window === "undefined") return;
    try {
      const storageKey = getUserStorageKey("oybek_exercises_list");
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      const updated = list.map((item) => (item.id === id ? { ...item, synced: isSynced } : item));
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  }

  mergeServerExpensesWithLocal(serverExpenses) {
    if (typeof window === "undefined") return;
    try {
      const storageKey = getUserStorageKey("oybek-system:expenses");
      const raw = localStorage.getItem(storageKey);
      const localList = raw ? JSON.parse(raw) : [];
      const unsyncedLocals = Array.isArray(localList) ? localList.filter((item) => item.synced === false) : [];

      const serverWithSync = serverExpenses.map((item) => ({ ...item, synced: true }));
      const mergedMap = new Map();
      serverWithSync.forEach((item) => mergedMap.set(item.id, item));
      unsyncedLocals.forEach((item) => mergedMap.set(item.id, item));

      const mergedList = Array.from(mergedMap.values());
      mergedList.sort((a, b) => new Date(b.spentAt || b.createdAt) - new Date(a.spentAt || a.createdAt));

      localStorage.setItem(storageKey, JSON.stringify(mergedList));
    } catch (err) {
      console.warn("Xarajatlarni birlashtirishda xato:", err);
    }
  }

  mergeServerDebtsWithLocal(serverDebts) {
    if (typeof window === "undefined" || !Array.isArray(serverDebts)) return;
    try {
      const storageKey = getUserStorageKey("oybek-system:pending_debts");
      const raw = localStorage.getItem(storageKey);
      const localList = raw ? JSON.parse(raw) : [];
      const unsyncedLocals = Array.isArray(localList) ? localList.filter((item) => item.synced === false) : [];

      const debtMap = new Map();
      serverDebts.forEach((d) => debtMap.set(d.id, { ...d, synced: true }));

      unsyncedLocals.forEach((localD) => {
        const serverD = debtMap.get(localD.id);
        if (serverD) {
          const serverPayments = serverD.payments || [];
          const localPayments = localD.payments || [];
          const payMap = new Map();
          serverPayments.forEach((p) => payMap.set(p.id, p));
          localPayments.forEach((p) => payMap.set(p.id, p));

          debtMap.set(localD.id, {
            ...serverD,
            ...localD,
            status: localD.status === "settled" || serverD.status === "settled" ? "settled" : (localD.status || serverD.status),
            payments: Array.from(payMap.values()),
            synced: false,
          });
        } else {
          debtMap.set(localD.id, localD);
        }
      });

      const merged = Array.from(debtMap.values());
      merged.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      localStorage.setItem(storageKey, JSON.stringify(merged));
    } catch (err) {
      console.warn("Qarzlarni birlashtirishda xato:", err);
    }
  }

  mergeServerExercisesWithLocal(serverExercises) {
    if (typeof window === "undefined") return;
    try {
      const storageKey = getUserStorageKey("oybek_exercises_list");
      const raw = localStorage.getItem(storageKey);
      const localList = raw ? JSON.parse(raw) : [];
      const unsyncedLocals = Array.isArray(localList) ? localList.filter((item) => item.synced === false) : [];

      const mergedMap = new Map();
      serverExercises.forEach((item) => mergedMap.set(item.id, { ...item, synced: true }));
      unsyncedLocals.forEach((item) => mergedMap.set(item.id, item));

      localStorage.setItem(storageKey, JSON.stringify(Array.from(mergedMap.values())));
    } catch (err) {
      console.warn("Mashqlarni birlashtirishda xato:", err);
    }
  }

  mergeServerLogsWithLocal(serverLogs) {
    if (typeof window === "undefined") return;
    try {
      const logKey = (l) => `${l.exerciseId}|${l.date}`;
      const storageKey = getUserStorageKey("oybek_exercise_logs");
      const raw = localStorage.getItem(storageKey);
      const localList = raw ? JSON.parse(raw) : [];
      const unsyncedLocals = Array.isArray(localList) ? localList.filter((item) => item.synced === false) : [];

      const mergedMap = new Map();
      serverLogs.forEach((item) => mergedMap.set(logKey(item), { ...item, synced: true }));
      unsyncedLocals.forEach((item) => mergedMap.set(logKey(item), item));

      localStorage.setItem(storageKey, JSON.stringify(Array.from(mergedMap.values())));
    } catch (err) {
      console.warn("Mashq jurnallarini birlashtirishda xato:", err);
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
      const rawExpenses = localStorage.getItem(getUserStorageKey("oybek-system:expenses"));
      const expenses = rawExpenses ? JSON.parse(rawExpenses) : [];
      const rawWallets = localStorage.getItem(getUserStorageKey("oybek-system:wallets"));
      const wallets = rawWallets ? JSON.parse(rawWallets) : {};
      const rawReserves = localStorage.getItem(getUserStorageKey("oybek-system:reserves"));
      const reserves = rawReserves ? JSON.parse(rawReserves) : {};
      const rawDollar = localStorage.getItem(getUserStorageKey("oybek-system:dollar_rate_history"));
      const dollarRateHistory = rawDollar ? JSON.parse(rawDollar) : [];
      const rawDebts = localStorage.getItem(getUserStorageKey("oybek-system:pending_debts"));
      const pendingDebts = rawDebts ? JSON.parse(rawDebts) : [];

      // 1. Zaxira endpointi orqali yuborish (wallets, expenses, reserves, dollar, debts)
      const backupPayload = {
        exportedAt: new Date().toISOString(),
        wallets,
        reserves,
        dollarRateHistory,
        pendingDebts,
        expenses,
        confirmWipe: true,
      };

      await apiClient.post(API_ENDPOINTS.BACKUP, backupPayload);

      // 2. Mashqlarni ham DBga yuklash
      const rawExercises = localStorage.getItem(getUserStorageKey("oybek_exercises_list"));
      const exercises = rawExercises ? JSON.parse(rawExercises) : [];
      for (const ex of exercises) {
        await apiClient.post(API_ENDPOINTS.EXERCISES, ex).catch(() => {});
      }

      // 3. Mashq jurnallarini ham DBga yuklash
      const rawLogs = localStorage.getItem(getUserStorageKey("oybek_exercise_logs"));
      const logs = rawLogs ? JSON.parse(rawLogs) : [];
      for (const log of logs) {
        await apiClient.post(API_ENDPOINTS.EXERCISE_LOGS, log).catch(() => {});
      }

      // 4. Markaziy bank kursini DB cbu_rate_log ga log qilish
      await apiClient.post(API_ENDPOINTS.EXCHANGE_RATE_SYNC_CBU, {}).catch(() => {});

      // Hammasini synced: true deb belgilash
      const allSynced = expenses.map((item) => ({ ...item, synced: true }));
      localStorage.setItem(getUserStorageKey("oybek-system:expenses"), JSON.stringify(allSynced));

      const allDebtsSynced = pendingDebts.map((item) => ({ ...item, synced: true }));
      localStorage.setItem(getUserStorageKey("oybek-system:pending_debts"), JSON.stringify(allDebtsSynced));

      const allExSynced = exercises.map((item) => ({ ...item, synced: true }));
      localStorage.setItem(getUserStorageKey("oybek_exercises_list"), JSON.stringify(allExSynced));

      const allLogsSynced = logs.map((item) => ({ ...item, synced: true }));
      localStorage.setItem(getUserStorageKey("oybek_exercise_logs"), JSON.stringify(allLogsSynced));

      this.clearQueue();

      const nowIso = new Date().toISOString();
      this.setLastSyncedAt(nowIso);
      this.addLog("success", `Barcha ma'lumotlar barcha jadvallar bo'yicha DBga muvaffaqiyatli saqlandi!`);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oybek:sync-complete", { detail: { timestamp: nowIso } }));
      }

      return { success: true, count: expenses.length + pendingDebts.length + exercises.length };
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
