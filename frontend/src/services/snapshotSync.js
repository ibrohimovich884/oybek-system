/**
 * Control Panel ma'lumotlarini (reserves, dollarRateHistory, pendingDebts)
 * backendning /api/snapshot endpointi (PostgreSQL `app_snapshot` jadvali)
 * bilan sinxronlash.
 *
 * Backend asosiy ma'lumot manbai (Source of Truth) sifatida ishlaydi.
 */
import { apiClient } from "../api/client.js";
import { API_ENDPOINTS } from "../config/apiConfig.js";

const KEYS = {
  reserves: "oybek-system:reserves",
  dollarRateHistory: "oybek-system:dollar_rate_history",
  pendingDebts: "oybek-system:pending_debts",
};
const MARKER_KEY = "oybek-system:snapshot_synced_at";

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function readLocalSnapshot() {
  return {
    reserves: readJson(KEYS.reserves, {}),
    dollarRateHistory: readJson(KEYS.dollarRateHistory, []),
    pendingDebts: readJson(KEYS.pendingDebts, []),
  };
}

let timer = null;

export function scheduleSnapshotPush(delayMs = 800) {
  if (typeof window === "undefined") return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    pushSnapshot().catch(() => {});
  }, delayMs);
}

export async function pushSnapshot() {
  const payload = readLocalSnapshot();
  const res = await apiClient.put(API_ENDPOINTS.SNAPSHOT, payload);
  if (res.ok) {
    localStorage.setItem(MARKER_KEY, new Date().toISOString());
  }
  return res;
}

/**
 * Backenddan app_snapshot ma'lumotlarini olish va lokal xotira bilan birlashtirish (Pull)
 */
export async function pullSnapshotFromDB() {
  const res = await apiClient.get(API_ENDPOINTS.SNAPSHOT);
  if (!res.ok || !res.data) {
    return null;
  }

  const server = res.data;
  const local = readLocalSnapshot();

  // 1. Qarzlar (pendingDebts): Hali serverga yuborilmagan unsynced qarzlarni saqlab qolamiz
  const localDebts = Array.isArray(local.pendingDebts) ? local.pendingDebts : [];
  const unsyncedDebts = localDebts.filter((d) => d.synced === false);

  const serverDebts = Array.isArray(server.pendingDebts) ? server.pendingDebts : [];
  const debtMap = new Map();
  serverDebts.forEach((d) => debtMap.set(d.id, { ...d, synced: true }));
  unsyncedDebts.forEach((d) => debtMap.set(d.id, d));
  const mergedDebts = Array.from(debtMap.values());
  localStorage.setItem(KEYS.pendingDebts, JSON.stringify(mergedDebts));

  // 2. Dollar kursi tarixi (dollarRateHistory)
  const localDollarHistory = Array.isArray(local.dollarRateHistory) ? local.dollarRateHistory : [];
  const unsyncedDollar = localDollarHistory.filter((d) => d.synced === false);
  const serverDollarHistory = Array.isArray(server.dollarRateHistory) ? server.dollarRateHistory : [];
  const dollarMap = new Map();
  serverDollarHistory.forEach((d) => dollarMap.set(d.id, { ...d, synced: true }));
  unsyncedDollar.forEach((d) => dollarMap.set(d.id, d));
  const mergedDollarHistory = Array.from(dollarMap.values());
  localStorage.setItem(KEYS.dollarRateHistory, JSON.stringify(mergedDollarHistory));

  // 3. Rezervlar (reserves - Server DB Source of Truth)
  if (server.reserves && typeof server.reserves === "object" && Object.keys(server.reserves).length > 0) {
    localStorage.setItem(KEYS.reserves, JSON.stringify(server.reserves));
  }

  localStorage.setItem(MARKER_KEY, new Date().toISOString());

  return {
    reserves: readJson(KEYS.reserves, {}),
    dollarRateHistory: mergedDollarHistory,
    pendingDebts: mergedDebts,
  };
}

export async function reconcileSnapshot() {
  return await pullSnapshotFromDB();
}
