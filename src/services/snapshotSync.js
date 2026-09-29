/**
 * Control Panel ma'lumotlarini (reserves, dollarRateHistory, pendingDebts)
 * backendning /api/snapshot endpointi bilan sinxronlash.
 *
 * Avval bu ma'lumotlar faqat localStorage'da qolib ketardi va DBga
 * umuman yetib bormasdi. Endi har bir o'zgarishdan keyin (debounce bilan)
 * backendga yuboriladi. Yangi qurilmada (lokal ma'lumot bo'sh bo'lsa)
 * serverdan tortib olinadi.
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

export function scheduleSnapshotPush(delayMs = 1500) {
  if (typeof window === "undefined") return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    pushSnapshot().catch(() => {});
  }, delayMs);
}

export async function pushSnapshot() {
  const res = await apiClient.put(API_ENDPOINTS.SNAPSHOT, readLocalSnapshot());
  if (res.ok) localStorage.setItem(MARKER_KEY, new Date().toISOString());
  return res.ok;
}

function serverHasData(s) {
  return (
    (s.pendingDebts?.length || 0) > 0 ||
    (s.dollarRateHistory?.length || 0) > 0 ||
    Object.keys(s.reserves || {}).length > 0
  );
}

/**
 * Yangi qurilmada serverdagi snapshotni lokalga yozadi.
 * Mavjud lokal ma'lumot bor bo'lsa ustidan YOZMAYDI — o'rniga uni serverga yuboradi.
 */
export async function reconcileSnapshot() {
  const res = await apiClient.get(API_ENDPOINTS.SNAPSHOT);
  if (!res.ok || !res.data) return false;

  const local = readLocalSnapshot();
  const localPristine =
    !localStorage.getItem(MARKER_KEY) &&
    (local.pendingDebts?.length || 0) === 0 &&
    (local.dollarRateHistory?.length || 0) === 0;

  if (localPristine && serverHasData(res.data)) {
    if (res.data.reserves && Object.keys(res.data.reserves).length) {
      localStorage.setItem(KEYS.reserves, JSON.stringify(res.data.reserves));
    }
    localStorage.setItem(KEYS.dollarRateHistory, JSON.stringify(res.data.dollarRateHistory || []));
    localStorage.setItem(KEYS.pendingDebts, JSON.stringify(res.data.pendingDebts || []));
    localStorage.setItem(MARKER_KEY, new Date().toISOString());
    return true;
  }
  return pushSnapshot();
}
