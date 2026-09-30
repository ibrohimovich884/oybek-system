/**
 * OYBEK SysteM - Database Sync & Offline Resiliency Engine
 * 
 * Ushbu xizmat quyidagilarni ta'minlaydi:
 * 1. Barcha jadvallar (wallets, transactions, transaction_edits, app_snapshot,
 *    cbu_rate_log, exercises, exercise_logs) uchun oflayn navbat (sync_queue).
 * 2. Internet tiklanganda yoki foydalanuvchi "Qo'lda sinxronizatsiya"
 *    tugmasini bosganda navbatdagi ma'lumotlarni DBga yozadi va
 *    bazasidan eng yangi ma'lumotlarni tortib oladi (Pull).
 * 3. Backendni asosiy manba (Source of Truth) sifatida ishlatadi.
 */

import { apiClient } from "../api/client.js";
import { API_ENDPOINTS } from "../config/apiConfig.js";
import { generateId } from "../utils/id.js";
import { pullSnapshotFromDB, readLocalSnapshot, pushSnapshot } from "./snapshotSync.js";

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

  /**
   * Navbatga har qanday jadval amalni qo'shish
   * entity: 'expenses' | 'wallets' | 'debts' | 'reserves' | 'dollar_rate_history' | 'exercises' | 'exercise_logs' | 'exchange_rate' | 'snapshot'
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

  /**
   * Brauzerdagi barcha lokal xotirani (localStorage) tozalash
   */
  clearAllStorage({ preserveBackendConfig = true } = {}) {
    if (typeof window === "undefined") return { success: true, count: 0 };
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith("oybek")) {
          if (
            preserveBackendConfig &&
            (key === "oybek_backend_url" ||
              key === "oybek_backend_port" ||
              key === "oybek_system:backend_url_v2" ||
              key === "oybek_system:backend_port")
          ) {
            continue;
          }
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((k) => localStorage.removeItem(k));
      this.notify();
      return { success: true, clearedKeys: keysToRemove, count: keysToRemove.length };
    } catch (err) {
      console.error("Local storage tozalashda xatolik:", err);
      return { success: false, error: err.message, count: 0 };
    }
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
            // C) Qarzlar, Zaxiralar, Dollar tarixi (app_snapshot jadvali)
            else if (
              item.entity === "debts" ||
              item.entity === "reserves" ||
              item.entity === "dollar_rate_history" ||
              item.entity === "snapshot"
            ) {
              res = await pushSnapshot();
              if (res.ok && item.entity === "debts" && item.targetId) {
                this.markLocalDebtSynced(item.targetId, true);
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
          localStorage.setItem("oybek-system:wallets", JSON.stringify(walletRes.data));
        }

        // C) Control Panel snapshot (app_snapshot: reserves, pendingDebts, dollarRateHistory)
        const snapshotData = await pullSnapshotFromDB().catch(() => null);
        if (snapshotData) {
          pulledCount += (snapshotData.pendingDebts?.length || 0) + (snapshotData.dollarRateHistory?.length || 0);
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

        // F) CBU kursi yangilash va cbu_rate_log ga yozish
        const cbuRes = await apiClient.post(API_ENDPOINTS.EXCHANGE_RATE_SYNC_CBU, {}).catch(() => null);
        if (cbuRes && cbuRes.ok && cbuRes.data?.rate) {
          localStorage.setItem("oybek-system:usd_rate", String(cbuRes.data.rate));
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
      const raw = localStorage.getItem("oybek-system:expenses");
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      const updated = list.map((item) => (item.id === id ? { ...item, synced: isSynced } : item));
      localStorage.setItem("oybek-system:expenses", JSON.stringify(updated));
    } catch {}
  }

  markLocalDebtSynced(id, isSynced = true) {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("oybek-system:pending_debts");
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      const updated = list.map((item) => (item.id === id ? { ...item, synced: isSynced } : item));
      localStorage.setItem("oybek-system:pending_debts", JSON.stringify(updated));
    } catch {}
  }

  markLocalExerciseSynced(id, isSynced = true) {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("oybek_exercises_list");
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      const updated = list.map((item) => (item.id === id ? { ...item, synced: isSynced } : item));
      localStorage.setItem("oybek_exercises_list", JSON.stringify(updated));
    } catch {}
  }

  mergeServerExpensesWithLocal(serverExpenses) {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("oybek-system:expenses");
      const localList = raw ? JSON.parse(raw) : [];
      const unsyncedLocals = Array.isArray(localList) ? localList.filter((item) => item.synced === false) : [];

      const serverWithSync = serverExpenses.map((item) => ({ ...item, synced: true }));
      const mergedMap = new Map();
      serverWithSync.forEach((item) => mergedMap.set(item.id, item));
      unsyncedLocals.forEach((item) => mergedMap.set(item.id, item));

      const mergedList = Array.from(mergedMap.values());
      mergedList.sort((a, b) => new Date(b.spentAt || b.createdAt) - new Date(a.spentAt || a.createdAt));

      localStorage.setItem("oybek-system:expenses", JSON.stringify(mergedList));
    } catch (err) {
      console.warn("Xarajatlarni birlashtirishda xato:", err);
    }
  }

  mergeServerExercisesWithLocal(serverExercises) {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("oybek_exercises_list");
      const localList = raw ? JSON.parse(raw) : [];
      const unsyncedLocals = Array.isArray(localList) ? localList.filter((item) => item.synced === false) : [];

      const mergedMap = new Map();
      serverExercises.forEach((item) => mergedMap.set(item.id, { ...item, synced: true }));
      unsyncedLocals.forEach((item) => mergedMap.set(item.id, item));

      localStorage.setItem("oybek_exercises_list", JSON.stringify(Array.from(mergedMap.values())));
    } catch (err) {
      console.warn("Mashqlarni birlashtirishda xato:", err);
    }
  }

  mergeServerLogsWithLocal(serverLogs) {
    if (typeof window === "undefined") return;
    try {
      const logKey = (l) => `${l.exerciseId}|${l.date}`;
      const raw = localStorage.getItem("oybek_exercise_logs");
      const localList = raw ? JSON.parse(raw) : [];
      const unsyncedLocals = Array.isArray(localList) ? localList.filter((item) => item.synced === false) : [];

      const mergedMap = new Map();
      serverLogs.forEach((item) => mergedMap.set(logKey(item), { ...item, synced: true }));
      unsyncedLocals.forEach((item) => mergedMap.set(logKey(item), item));

      localStorage.setItem("oybek_exercise_logs", JSON.stringify(Array.from(mergedMap.values())));
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
      const rawExpenses = localStorage.getItem("oybek-system:expenses");
      const expenses = rawExpenses ? JSON.parse(rawExpenses) : [];
      const rawWallets = localStorage.getItem("oybek-system:wallets");
      const wallets = rawWallets ? JSON.parse(rawWallets) : {};
      const { reserves, dollarRateHistory, pendingDebts } = readLocalSnapshot();

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
      const rawExercises = localStorage.getItem("oybek_exercises_list");
      const exercises = rawExercises ? JSON.parse(rawExercises) : [];
      for (const ex of exercises) {
        await apiClient.post(API_ENDPOINTS.EXERCISES, ex).catch(() => {});
      }

      // 3. Mashq jurnallarini ham DBga yuklash
      const rawLogs = localStorage.getItem("oybek_exercise_logs");
      const logs = rawLogs ? JSON.parse(rawLogs) : [];
      for (const log of logs) {
        await apiClient.post(API_ENDPOINTS.EXERCISE_LOGS, log).catch(() => {});
      }

      // 4. Markaziy bank kursini DB cbu_rate_log ga log qilish
      await apiClient.post(API_ENDPOINTS.EXCHANGE_RATE_SYNC_CBU, {}).catch(() => {});

      // Hammasini synced: true deb belgilash
      const allSynced = expenses.map((item) => ({ ...item, synced: true }));
      localStorage.setItem("oybek-system:expenses", JSON.stringify(allSynced));

      const allDebtsSynced = pendingDebts.map((item) => ({ ...item, synced: true }));
      localStorage.setItem("oybek-system:pending_debts", JSON.stringify(allDebtsSynced));

      const allExSynced = exercises.map((item) => ({ ...item, synced: true }));
      localStorage.setItem("oybek_exercises_list", JSON.stringify(allExSynced));

      const allLogsSynced = logs.map((item) => ({ ...item, synced: true }));
      localStorage.setItem("oybek_exercise_logs", JSON.stringify(allLogsSynced));

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
