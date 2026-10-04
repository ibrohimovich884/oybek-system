/**
 * Expenses and Wallets Data Layer (OYBEK SysteM)
 * 
 * Strukturaviy xavfsizlik:
 * - Foydalanuvchi faqat backend portini kiritishi kifoya.
 * - Backend o'chiq bo'lsa ham frontendda xatolik chiqmaydi (fallback to localStorage).
 * - Backend yoqilishi bilan avtomatik unga ulanadi va sinxronizatsiya qiladi.
 */

import { generateId } from "../utils/id.js";
import { DEFAULT_WALLETS, DEFAULT_RESERVES } from "../constants/money.js";
import { formatISOWithOffset } from "../utils/format.js";
import { apiClient } from "./client.js";
import {
  API_ENDPOINTS,
  getBackendPort,
  setBackendPort as saveBackendPort,
  setBackendBaseUrl as saveBackendBaseUrl,
} from "../config/apiConfig.js";
import { syncService } from "../services/syncService.js";
import { scheduleSnapshotPush, pushSnapshot, pullSnapshotFromDB } from "../services/snapshotSync.js";
import { getUserStorageKey } from "../utils/storageKeys.js";

const BASE_EXPENSES_KEY = "oybek-system:expenses";
const BASE_WALLETS_KEY = "oybek-system:wallets";
const BASE_RESERVES_KEY = "oybek-system:reserves";
const BASE_DOLLAR_RATES_KEY = "oybek-system:dollar_rate_history";
const BASE_PENDING_DEBTS_KEY = "oybek-system:pending_debts";

const LEGACY_MAP = {
  "naqd-asosiy": "naqd_reserve",
  "karta-asosiy": "karta_reserve",
  "dollar-asosiy": "dollar_reserve",
};

export function canonicalWalletId(id) {
  if (!id) return id;
  return LEGACY_MAP[id] || id;
}

/**
 * Mahalliy xotiradan (localStorage) hamyonlarni o'qish (Multi-User Scoped)
 */
function readLocalWallets() {
  if (typeof window === "undefined") return { ...DEFAULT_WALLETS };
  const storageKey = getUserStorageKey(BASE_WALLETS_KEY);
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    localStorage.setItem(storageKey, JSON.stringify(DEFAULT_WALLETS));
    return { ...DEFAULT_WALLETS };
  }
  try {
    const parsed = JSON.parse(raw);
    const naqdRes = Number(parsed.naqd_reserve ?? parsed["naqd-asosiy"] ?? DEFAULT_WALLETS.naqd_reserve);
    const kartaRes = Number(parsed.karta_reserve ?? parsed["karta-asosiy"] ?? DEFAULT_WALLETS.karta_reserve);
    const dollarRes = Number(parsed.dollar_reserve ?? parsed["dollar-asosiy"] ?? DEFAULT_WALLETS.dollar_reserve);

    return {
      hamyon: Number(parsed.hamyon ?? DEFAULT_WALLETS.hamyon),
      naqd: Number(parsed.naqd ?? DEFAULT_WALLETS.naqd),
      karta: Number(parsed.karta ?? DEFAULT_WALLETS.karta),
      dollar: Number(parsed.dollar ?? DEFAULT_WALLETS.dollar),
      naqd_reserve: naqdRes,
      karta_reserve: kartaRes,
      dollar_reserve: dollarRes,
      "naqd-asosiy": naqdRes,
      "karta-asosiy": kartaRes,
      "dollar-asosiy": dollarRes,
    };
  } catch {
    return { ...DEFAULT_WALLETS };
  }
}

function writeLocalWallets(wallets) {
  if (typeof window === "undefined") return;
  const storageKey = getUserStorageKey(BASE_WALLETS_KEY);
  localStorage.setItem(storageKey, JSON.stringify(wallets));
}

/**
 * Asosiy (reserve) balanslarni o'qish va saqlash (Multi-User Scoped)
 */
function readLocalReserves() {
  if (typeof window === "undefined") return { ...DEFAULT_RESERVES };
  const storageKey = getUserStorageKey(BASE_RESERVES_KEY);
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    localStorage.setItem(storageKey, JSON.stringify(DEFAULT_RESERVES));
    return { ...DEFAULT_RESERVES };
  }
  try {
    const parsed = JSON.parse(raw);
    const res = { ...DEFAULT_RESERVES };
    const keys = ["naqd_reserve", "karta_reserve", "dollar_reserve"];
    for (const key of keys) {
      const legacyKey = key.replace("_reserve", "-asosiy");
      const src = (parsed && (parsed[key] || parsed[legacyKey])) || DEFAULT_RESERVES[key];
      const data = {
        ...DEFAULT_RESERVES[key],
        ...src,
        id: key,
        amount: Number(src.amount || 0),
        notes: Array.isArray(src.notes) ? src.notes : [],
      };
      res[key] = data;
      res[legacyKey] = data;
    }
    return res;
  } catch {
    return { ...DEFAULT_RESERVES };
  }
}

function writeLocalReserves(reserves) {
  if (typeof window === "undefined") return;
  const storageKey = getUserStorageKey(BASE_RESERVES_KEY);
  localStorage.setItem(storageKey, JSON.stringify(reserves));
  scheduleSnapshotPush();
}

/**
 * Dollar kursi tarixi
 */
function readLocalDollarRateHistory() {
  if (typeof window === "undefined") return [];
  const storageKey = getUserStorageKey(BASE_DOLLAR_RATES_KEY);
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalDollarRateHistory(history) {
  if (typeof window === "undefined") return;
  const storageKey = getUserStorageKey(BASE_DOLLAR_RATES_KEY);
  localStorage.setItem(storageKey, JSON.stringify(history));
  scheduleSnapshotPush();
}

function readLocalPendingDebts() {
  if (typeof window === "undefined") return [];
  const storageKey = getUserStorageKey(BASE_PENDING_DEBTS_KEY);
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalPendingDebts(debts) {
  if (typeof window === "undefined") return;
  const storageKey = getUserStorageKey(BASE_PENDING_DEBTS_KEY);
  localStorage.setItem(storageKey, JSON.stringify(debts));
  scheduleSnapshotPush();
}

/**
 * Tranzaksiya ma'lumotlarini to'liq va xatosiz standartga keltirish
 */
export function normalizeExpense(item) {
  const rawPaymentMethod = item.paymentMethod || item.wallet || "hamyon";
  const paymentMethod = canonicalWalletId(rawPaymentMethod);
  const wallet = canonicalWalletId(item.wallet || rawPaymentMethod);
  const quantity = Number(item.quantity ?? 1);
  const spentAt = formatISOWithOffset(item.spentAt || item.createdAt || new Date());
  const createdAt = formatISOWithOffset(item.createdAt || item.spentAt || new Date());
  const edits = Array.isArray(item.edits) ? item.edits : [];
  const currency = item.currency || (wallet === "dollar" || wallet === "dollar_reserve" ? "USD" : "UZS");
  const exchangeRateAtTime = item.exchangeRateAtTime || item.exchangeRate || null;

  let category = item.category || "Qorin uchun";
  let subcategory = item.subcategory || "";

  // Eski "Ichimlik" yoki "Oziq-ovqat" bo'lsa "Qorin uchun" ga tekislash
  if (category === "Ichimlik") {
    category = "Qorin uchun";
    subcategory = "Ichimlik";
  } else if (category === "Oziq-ovqat") {
    category = "Qorin uchun";
  }

  if (!subcategory) {
    if (category === "Qorin uchun" || category === "Oziq-ovqat") subcategory = "Ovqat";
    else if (category === "Transport") subcategory = "Avtobus";
    else if (category === "Ta’lim") subcategory = "Kurs";
    else if (category === "Texnologiya") subcategory = "Telefon";
    else if (category === "Kiyim-kechak") subcategory = "Kiyim";
    else if (category === "Uy-ro‘zg‘or") subcategory = "Uy buyumlari";
    else if (category === "Ko‘ngilochar") subcategory = "O‘yin";
    else if (category === "Sport") subcategory = "Mashg‘ulot";
    else if (category === "Sog‘liq") subcategory = "Dori";
    else if (category === "Sovg‘alar") subcategory = "Sovg‘a";
    else if (category === "Do‘stlar") subcategory = "Uchrashuv";
    else subcategory = "Boshqa";
  }

  return {
    id: item.id || generateId(),
    amount: Number(item.amount || 0),
    category,
    subcategory,
    reason: item.reason || "",
    location: item.location || "",
    paymentMethod,
    quantity,
    spentAt,
    createdAt,
    edits,
    type: item.type || "expense",
    wallet,
    currency,
    exchangeRateAtTime,
    fromWallet: item.fromWallet ? canonicalWalletId(item.fromWallet) : null,
    toWallet: item.toWallet ? canonicalWalletId(item.toWallet) : null,
    synced: item.synced !== undefined ? Boolean(item.synced) : true,
  };
}

/**
 * Mahalliy ro'yxatni o'qish (localStorage - Multi-User Scoped)
 */
function readLocalExpenses() {
  if (typeof window === "undefined") return [];
  const storageKey = getUserStorageKey(BASE_EXPENSES_KEY);
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return [];
  }
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.map(normalizeExpense);
  } catch {
    return [];
  }
}

function writeLocalExpenses(items) {
  if (typeof window === "undefined") return;
  const storageKey = getUserStorageKey(BASE_EXPENSES_KEY);
  localStorage.setItem(storageKey, JSON.stringify(items));
}

// ==========================================
// OMMAVIY API FUNKSIYALARI (ASYNC)
// ==========================================

/**
 * Barcha xarajatlar ro'yxatini olish
 */
export async function getExpenses() {
  const localItems = readLocalExpenses();
  const unsyncedLocals = localItems.filter((i) => i.synced === false);

  // 1. Backendga so'rov yuborish
  const res = await apiClient.get(API_ENDPOINTS.EXPENSES);
  if (res.ok && Array.isArray(res.data)) {
    const serverItems = res.data.map((item) => ({
      ...normalizeExpense(item),
      synced: true,
    }));

    // Birlashtirish: serverdagi ma'lumotlar + hali DBga yuborilmagan lokal unsynced ma'lumotlar
    const mergedMap = new Map();
    serverItems.forEach((item) => mergedMap.set(item.id, item));
    unsyncedLocals.forEach((item) => mergedMap.set(item.id, item));

    const merged = Array.from(mergedMap.values());
    merged.sort((a, b) => new Date(b.spentAt || b.createdAt) - new Date(a.spentAt || a.createdAt));

    writeLocalExpenses(merged);
    syncService.setLastSyncedAt(new Date().toISOString());
    return merged;
  }

  // 2. Agar backend o'chiq bo'lsa, xatosiz mahalliy ma'lumotni qaytaramiz
  return localItems;
}

/**
 * Hamyonlar balansini olish (barcha 7 ta hamyon)
 */
export async function getWallets() {
  const res = await apiClient.get(API_ENDPOINTS.WALLETS);
  if (res.ok && res.data && typeof res.data === "object") {
    const d = res.data;
    const parsed = {
      hamyon: Number(d.hamyon ?? DEFAULT_WALLETS.hamyon),
      naqd: Number(d.naqd ?? DEFAULT_WALLETS.naqd),
      karta: Number(d.karta ?? DEFAULT_WALLETS.karta),
      dollar: Number(d.dollar ?? DEFAULT_WALLETS.dollar),
      naqd_reserve: Number(d.naqd_reserve ?? d["naqd-asosiy"] ?? DEFAULT_WALLETS.naqd_reserve),
      karta_reserve: Number(d.karta_reserve ?? d["karta-asosiy"] ?? DEFAULT_WALLETS.karta_reserve),
      dollar_reserve: Number(d.dollar_reserve ?? d["dollar-asosiy"] ?? DEFAULT_WALLETS.dollar_reserve),
      "naqd-asosiy": Number(d.naqd_reserve ?? d["naqd-asosiy"] ?? DEFAULT_WALLETS.naqd_reserve),
      "karta-asosiy": Number(d.karta_reserve ?? d["karta-asosiy"] ?? DEFAULT_WALLETS.karta_reserve),
      "dollar-asosiy": Number(d.dollar_reserve ?? d["dollar-asosiy"] ?? DEFAULT_WALLETS.dollar_reserve),
    };
    writeLocalWallets(parsed);
    return parsed;
  }

  return readLocalWallets();
}

/**
 * Yangi xarajat / daromad / o'tkazma qo'shish
 */
export async function addExpense(payload) {
  const type = payload.type || "expense";
  const paymentMethod = payload.paymentMethod || payload.wallet || (type === "transfer" ? "karta" : "naqd");

  const category = payload.category?.trim() || (type === "income" ? "Oylik maosh" : type === "transfer" ? "O'tkazma" : "Qorin uchun");
  const subcategory = payload.subcategory?.trim() || (type === "income" ? "Oylik" : type === "transfer" ? "O'tkazma" : "Ichimlik");

  const newRecord = {
    id: payload.id || generateId(),
    amount: Number(payload.amount || 0),
    category,
    subcategory,
    reason: payload.reason?.trim() || "",
    location: payload.location?.trim() || "",
    paymentMethod,
    quantity: Number(payload.quantity || 1),
    spentAt: formatISOWithOffset(payload.spentAt || new Date()),
    createdAt: formatISOWithOffset(new Date()),
    edits: [],
    type,
    wallet: paymentMethod,
    currency: payload.currency || (paymentMethod === "dollar" ? "USD" : "UZS"),
    exchangeRateAtTime: payload.exchangeRateAtTime || null,
    fromWallet: payload.fromWallet || (type === "transfer" ? "karta" : null),
    toWallet: payload.toWallet || (type === "transfer" ? "naqd" : null),
    synced: false, // Boshlanishida xotirada, DB tasdig'i kutiladi
  };

  // 1. Darhol mahalliy xotiraga saqlaymiz (UI tez ishlashi uchun)
  const localItems = readLocalExpenses();
  localItems.unshift(newRecord);
  writeLocalExpenses(localItems);

  // 2. Oflayn / sinxronizatsiya navbatiga qo'shamiz
  const queueEntry = syncService.addToQueue({
    entity: "expenses",
    type: "create",
    targetId: newRecord.id,
    payload: newRecord,
  });

  // 3. Backendga yuborish
  try {
    const res = await apiClient.post(API_ENDPOINTS.EXPENSES, newRecord);
    if (res && res.ok) {
      newRecord.synced = true;
      syncService.removeFromQueue(queueEntry.queueId);
      syncService.markLocalExpenseSynced(newRecord.id, true);
      syncService.addLog("success", `Tranzaksiya DBga saqlandi: ${newRecord.amount} (${newRecord.category})`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oybek:item-synced", { detail: { id: newRecord.id } }));
      }
    } else {
      syncService.addLog("warning", `Server DBga saqlash kechikdi: ${res?.error || 'Navbatda qoldi'}`);
    }
  } catch {
    // Backend o'chiq bo'lsa navbatda qoladi
  }

  return newRecord;
}

/**
 * Tranzaksiyani tahrirlash
 */
export async function updateExpense(id, updates) {
  const localItems = readLocalExpenses();
  const index = localItems.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Tranzaksiya topilmadi");

  const current = localItems[index];
  const nextEdits = Array.isArray(current.edits) ? [...current.edits] : [];
  const nowOffset = formatISOWithOffset(new Date());

  const trackedFields = [
    "reason",
    "amount",
    "category",
    "subcategory",
    "location",
    "paymentMethod",
    "quantity",
    "spentAt",
  ];

  trackedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      const oldVal = current[field];
      const newVal = updates[field];
      if (String(oldVal ?? "") !== String(newVal ?? "")) {
        nextEdits.push({
          field,
          from: String(oldVal ?? ""),
          to: String(newVal ?? ""),
          editedAt: nowOffset,
        });
      }
    }
  });

  const updatedRecord = {
    ...current,
    ...updates,
    amount: updates.amount !== undefined ? Number(updates.amount) : current.amount,
    quantity: updates.quantity !== undefined ? Number(updates.quantity) : current.quantity,
    edits: nextEdits,
    synced: false, // Tahrir qilingani uchun qayta DBga borishi kerak
  };

  // Mahalliy saqlaymiz
  localItems[index] = updatedRecord;
  writeLocalExpenses(localItems);

  // Navbatga qo'shish
  const queueEntry = syncService.addToQueue({
    entity: "expenses",
    type: "update",
    targetId: id,
    payload: updatedRecord,
  });

  // Backendga yuborish
  try {
    const res = await apiClient.put(API_ENDPOINTS.EXPENSE_DETAIL(id), updatedRecord);
    if (res && res.ok) {
      updatedRecord.synced = true;
      syncService.removeFromQueue(queueEntry.queueId);
      syncService.markLocalExpenseSynced(id, true);
      syncService.addLog("success", `Tranzaksiya yangilanishi DBga yozildi (${id})`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oybek:item-synced", { detail: { id } }));
      }
    }
  } catch {
    // Offline
  }

  return updatedRecord;
}

/**
 * Tranzaksiyani o'chirish
 */
export async function deleteExpense(id) {
  const localItems = readLocalExpenses();
  const filtered = localItems.filter((item) => item.id !== id);
  writeLocalExpenses(filtered);

  const queueEntry = syncService.addToQueue({
    entity: "expenses",
    type: "delete",
    targetId: id,
  });

  // Backenddan o'chirish
  try {
    const res = await apiClient.delete(API_ENDPOINTS.EXPENSE_DETAIL(id));
    if (res && res.ok) {
      syncService.removeFromQueue(queueEntry.queueId);
      syncService.addLog("success", `Tranzaksiya DBdan ham o'chirildi (${id})`);
    }
  } catch {
    // Offline
  }

  return { success: true };
}

/**
 * Hamyonlar boshlang'ich balansini yangilash
 */
export async function updateWallets(updates) {
  const current = readLocalWallets();
  const saved = {
    hamyon: Number(updates.hamyon !== undefined ? updates.hamyon : current.hamyon),
    naqd: Number(updates.naqd !== undefined ? updates.naqd : current.naqd),
    karta: Number(updates.karta !== undefined ? updates.karta : current.karta),
    dollar: Number(updates.dollar !== undefined ? updates.dollar : current.dollar),
    naqd_reserve: Number(updates.naqd_reserve !== undefined ? updates.naqd_reserve : (updates["naqd-asosiy"] !== undefined ? updates["naqd-asosiy"] : current.naqd_reserve)),
    karta_reserve: Number(updates.karta_reserve !== undefined ? updates.karta_reserve : (updates["karta-asosiy"] !== undefined ? updates["karta-asosiy"] : current.karta_reserve)),
    dollar_reserve: Number(updates.dollar_reserve !== undefined ? updates.dollar_reserve : (updates["dollar-asosiy"] !== undefined ? updates["dollar-asosiy"] : current.dollar_reserve)),
  };
  saved["naqd-asosiy"] = saved.naqd_reserve;
  saved["karta-asosiy"] = saved.karta_reserve;
  saved["dollar-asosiy"] = saved.dollar_reserve;

  writeLocalWallets(saved);

  const queueEntry = syncService.addToQueue({
    entity: "wallets",
    type: "update",
    targetId: "wallets",
    payload: saved,
  });

  apiClient.put(API_ENDPOINTS.WALLETS, saved)
    .then((res) => {
      if (res && res.ok) {
        syncService.removeFromQueue(queueEntry.queueId);
        syncService.addLog("success", "Hamyonlar balansi DBga saqlandi");
      }
    })
    .catch(() => {});

  return saved;
}

/**
 * Asosiy (reserve) balanslarni olish (DB wallets va wallet_notes jadvali asosiy manba)
 */
export async function getReserves() {
  // 1. PostgreSQL wallets va wallet_notes jadvallaridan olish
  try {
    const res = await apiClient.get(`${API_ENDPOINTS.WALLETS}?withNotes=true`);
    if (res.ok && Array.isArray(res.data)) {
      const reserves = { ...DEFAULT_RESERVES };
      for (const w of res.data) {
        if (w.id === "naqd_reserve" || w.id === "karta_reserve" || w.id === "dollar_reserve") {
          const legacyId = w.id.replace("_reserve", "-asosiy");
          const item = {
            id: w.id,
            wallet: w.parentId || w.id.replace("_reserve", ""),
            name: w.name,
            amount: Number(w.balance || 0),
            notes: Array.isArray(w.notes) ? w.notes : [],
          };
          reserves[w.id] = item;
          reserves[legacyId] = item;
        }
      }
      writeLocalReserves(reserves);
      return reserves;
    }
  } catch (e) {
    console.warn("DB wallets jadvalidan rezervlarni olishda ogohlantirish:", e);
  }

  // 2. Snapshot orqali zaxira tekshiruvi
  try {
    const pulled = await pullSnapshotFromDB();
    if (pulled && pulled.reserves && Object.keys(pulled.reserves).length > 0) {
      return pulled.reserves;
    }
  } catch (e) {
    console.warn("Snapshotdan olishda ogohlantirish:", e);
  }

  return readLocalReserves();
}

/**
 * Asosiy balansni yangilash (APPEND-ONLY notes bilan va DBga snapshot yuborish)
 */
export async function updateReserve(rawId, { amount, noteText, exchangeRateAtTime }) {
  const id = canonicalWalletId(rawId);
  const legacyId = id.replace("_reserve", "-asosiy");
  const reserves = readLocalReserves();
  const target = reserves[id] || reserves[legacyId];
  if (!target) {
    throw new Error(`Asosiy zaxira topilmadi: ${rawId}`);
  }

  const oldAmount = Number(target.amount || 0);
  const newAmount = Number(amount);
  const now = formatISOWithOffset(new Date());

  const existingNotes = Array.isArray(target.notes) ? [...target.notes] : [];
  const cleanNote = (noteText || "").trim() || `Balans yangilandi: ${newAmount}`;

  const newNoteEntry = {
    id: generateId(),
    text: cleanNote,
    amount_at_that_time: newAmount,
    amountAtTime: newAmount,
    editedAt: now,
    createdAt: now,
    exchangeRate: exchangeRateAtTime || null,
  };

  // APPEND-ONLY: Eski izoh o'chirilmaydi, yangi izoh qo'shiladi
  existingNotes.unshift(newNoteEntry);

  target.amount = newAmount;
  target.notes = existingNotes;
  reserves[id] = target;
  reserves[legacyId] = target;

  writeLocalReserves(reserves);

  // Wallets lokal bazasini ham sinxron yangilaymiz
  const localWallets = readLocalWallets();
  localWallets[id] = newAmount;
  localWallets[legacyId] = newAmount;
  writeLocalWallets(localWallets);

  const queueEntry = syncService.addToQueue({
    entity: "reserves",
    type: "update",
    targetId: id,
    payload: { id, amount: newAmount, noteText: cleanNote, exchangeRateAtTime },
  });

  // DB wallets jadvaliga ham yuboramiz
  apiClient.put(API_ENDPOINTS.WALLETS, { [id]: newAmount }).catch(() => {});
  apiClient.post(`${API_ENDPOINTS.WALLETS}/${id}/notes`, {
    text: cleanNote,
    amountAtTime: newAmount,
    editedAt: now,
  }).catch(() => {});

  pushSnapshot()
    .then((res) => {
      if (res && res.ok) {
        syncService.removeFromQueue(queueEntry.queueId);
        syncService.addLog("success", `Rezerv balansi DBga saqlandi: ${id}`);
      }
    })
    .catch(() => {});

  // Agar Dollar Asosiy bo'lsa, kurs tarixini ham saqlaymiz
  if ((id === "dollar_reserve" || id === "dollar-asosiy") && newAmount !== oldAmount) {
    const diff = newAmount - oldAmount;
    addDollarRateRecord({
      amount: Math.abs(diff),
      direction: diff > 0 ? "kirim" : "chiqim",
      target: "asosiy",
      exchangeRateAtTime: exchangeRateAtTime || 12850,
      occurredAt: now,
      note: cleanNote,
    });
  }

  return reserves;
}

/**
 * Dollar kursi tarixi
 */
export async function getDollarRateHistory() {
  try {
    const pulled = await pullSnapshotFromDB();
    if (pulled && Array.isArray(pulled.dollarRateHistory)) {
      return pulled.dollarRateHistory;
    }
  } catch (e) {
    console.warn("DBdan dollar tarixini olishda ogohlantirish:", e);
  }
  return readLocalDollarRateHistory();
}

export function addDollarRateRecord(record) {
  const history = readLocalDollarRateHistory();
  const newRecord = {
    id: generateId(),
    amount: Number(record.amount || 0),
    direction: record.direction || "kirim",
    target: record.target || "oddiy", // "oddiy" | "asosiy"
    exchangeRateAtTime: Number(record.exchangeRateAtTime || 12850),
    occurredAt: formatISOWithOffset(record.occurredAt || new Date()),
    note: record.note || "",
  };
  history.unshift(newRecord);
  writeLocalDollarRateHistory(history);

  const queueEntry = syncService.addToQueue({
    entity: "dollar_rate_history",
    type: "create",
    targetId: newRecord.id,
    payload: newRecord,
  });

  pushSnapshot()
    .then((res) => {
      if (res && res.ok) {
        syncService.removeFromQueue(queueEntry.queueId);
        syncService.addLog("success", `Dollar tarixi DBga saqlandi: ${newRecord.direction} ${newRecord.amount}$`);
      }
    })
    .catch(() => {});

  return newRecord;
}

/**
 * Kelajakdagi qarz daftarchasi uchun
 */
export async function getPendingDebts() {
  return readLocalPendingDebts();
}

export async function savePendingDebts(debts) {
  writeLocalPendingDebts(debts);
  return debts;
}

/**
 * Zaxira nusxa (Backup) eksporti
 */
export async function exportBackup() {
  const expenses = await getExpenses();
  const wallets = await getWallets();
  const reserves = await getReserves();
  const dollarRateHistory = await getDollarRateHistory();
  const pendingDebts = await getPendingDebts();

  return {
    version: "3.0.0",
    exportedAt: new Date().toISOString(),
    backendPort: getBackendPort(),
    wallets,
    reserves,
    dollarRateHistory,
    pendingDebts,
    expenses,
  };
}

/**
 * Zaxira nusxani tiklash (Import)
 */
export async function importBackup(backupData) {
  if (!backupData || !Array.isArray(backupData.expenses)) {
    throw new Error("Noto'g'ri zaxira fayli formati");
  }

  if (backupData.wallets) {
    writeLocalWallets(backupData.wallets);
  }

  if (backupData.reserves) {
    writeLocalReserves(backupData.reserves);
  }

  if (Array.isArray(backupData.dollarRateHistory)) {
    writeLocalDollarRateHistory(backupData.dollarRateHistory);
  }

  if (Array.isArray(backupData.pendingDebts)) {
    writeLocalPendingDebts(backupData.pendingDebts);
  }

  const normalized = backupData.expenses.map(normalizeExpense);
  writeLocalExpenses(normalized);

  // Agar backend mavjud bo'lsa, zaxirani unga ham yuborish
  apiClient.post(API_ENDPOINTS.BACKUP, backupData).catch(() => {});

  return true;
}

/**
 * Backend holatini boshqarish va obuna bo'lish
 */
export function getBackendStatus() {
  return apiClient.getStatus();
}

export function subscribeBackendStatus(callback) {
  return apiClient.subscribe(callback);
}

export async function checkBackendConnection() {
  return apiClient.checkHealth();
}

export function updateBackendPort(port) {
  saveBackendPort(port);
  return apiClient.checkHealth();
}

export function updateBackendUrl(url) {
  saveBackendBaseUrl(url);
  return apiClient.checkHealth();
}
