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

const STORAGE_EXPENSES_KEY = "oybek-system:expenses";
const STORAGE_WALLETS_KEY = "oybek-system:wallets";
const STORAGE_RESERVES_KEY = "oybek-system:reserves";
const STORAGE_DOLLAR_RATES_KEY = "oybek-system:dollar_rate_history";
const STORAGE_PENDING_DEBTS_KEY = "oybek-system:pending_debts";

/**
 * Mahalliy xotiradan (localStorage) hamyonlarni o'qish
 */
function readLocalWallets() {
  if (typeof window === "undefined") return { ...DEFAULT_WALLETS };
  const raw = localStorage.getItem(STORAGE_WALLETS_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_WALLETS_KEY, JSON.stringify(DEFAULT_WALLETS));
    return { ...DEFAULT_WALLETS };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      hamyon: Number(parsed.hamyon ?? DEFAULT_WALLETS.hamyon),
      naqd: Number(parsed.naqd ?? DEFAULT_WALLETS.naqd),
      karta: Number(parsed.karta ?? DEFAULT_WALLETS.karta),
      dollar: Number(parsed.dollar ?? DEFAULT_WALLETS.dollar),
    };
  } catch {
    return { ...DEFAULT_WALLETS };
  }
}

function writeLocalWallets(wallets) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_WALLETS_KEY, JSON.stringify(wallets));
}

/**
 * Asosiy (reserve) balanslarni o'qish va saqlash
 */
function readLocalReserves() {
  if (typeof window === "undefined") return { ...DEFAULT_RESERVES };
  const raw = localStorage.getItem(STORAGE_RESERVES_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_RESERVES_KEY, JSON.stringify(DEFAULT_RESERVES));
    return { ...DEFAULT_RESERVES };
  }
  try {
    const parsed = JSON.parse(raw);
    // Har bir asosiy balans mavjudligini va append-only notes massivini tekshiramiz
    const res = { ...DEFAULT_RESERVES };
    for (const key of ["naqd-asosiy", "karta-asosiy", "dollar-asosiy"]) {
      if (parsed && parsed[key]) {
        res[key] = {
          ...DEFAULT_RESERVES[key],
          ...parsed[key],
          amount: Number(parsed[key].amount || 0),
          notes: Array.isArray(parsed[key].notes) ? parsed[key].notes : [...DEFAULT_RESERVES[key].notes],
        };
      }
    }
    return res;
  } catch {
    return { ...DEFAULT_RESERVES };
  }
}

function writeLocalReserves(reserves) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_RESERVES_KEY, JSON.stringify(reserves));
}

/**
 * Dollar kursi tarixi
 */
function readLocalDollarRateHistory() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_DOLLAR_RATES_KEY);
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
  localStorage.setItem(STORAGE_DOLLAR_RATES_KEY, JSON.stringify(history));
}

/**
 * Kelajakdagi qarz daftarchasi uchun
 */
function readLocalPendingDebts() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_PENDING_DEBTS_KEY);
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
  localStorage.setItem(STORAGE_PENDING_DEBTS_KEY, JSON.stringify(debts));
}

/**
 * Tranzaksiya ma'lumotlarini to'liq va xatosiz standartga keltirish
 */
export function normalizeExpense(item) {
  const paymentMethod = item.paymentMethod || item.wallet || "hamyon";
  const wallet = item.wallet || paymentMethod;
  const quantity = Number(item.quantity ?? 1);
  const spentAt = formatISOWithOffset(item.spentAt || item.createdAt || new Date());
  const createdAt = formatISOWithOffset(item.createdAt || item.spentAt || new Date());
  const edits = Array.isArray(item.edits) ? item.edits : [];
  const currency = item.currency || (wallet === "dollar" ? "USD" : "UZS");
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
    fromWallet: item.fromWallet || null,
    toWallet: item.toWallet || null,
  };
}

/**
 * Mahalliy ro'yxatni o'qish (localStorage)
 */
function readLocalExpenses() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_EXPENSES_KEY);
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
  localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(items));
}

// ==========================================
// OMMAVIY API FUNKSIYALARI (ASYNC)
// ==========================================

/**
 * Barcha xarajatlar ro'yxatini olish
 * Backend ishlasa - backenddan oladi va keshlaydi;
 * Backend ishlamasa - xatosiz mahalliy bazadan oladi.
 */
export async function getExpenses() {
  // 1. Backendga so'rov yuborish
  const res = await apiClient.get(API_ENDPOINTS.EXPENSES);
  if (res.ok && Array.isArray(res.data)) {
    const normalized = res.data.map(normalizeExpense);
    writeLocalExpenses(normalized); // Mahalliy keshni yangilaymiz
    return normalized;
  }

  // 2. Agar backend o'chiq bo'lsa, xatosiz mahalliy ma'lumotni qaytaramiz
  return readLocalExpenses();
}

/**
 * Hamyonlar balansini olish
 */
export async function getWallets() {
  const res = await apiClient.get(API_ENDPOINTS.WALLETS);
  if (res.ok && res.data && typeof res.data === "object") {
    const parsed = {
      naqd: Number(res.data.naqd ?? DEFAULT_WALLETS.naqd),
      karta: Number(res.data.karta ?? DEFAULT_WALLETS.karta),
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
    fromWallet: payload.fromWallet || (type === "transfer" ? "karta" : null),
    toWallet: payload.toWallet || (type === "transfer" ? "naqd" : null),
  };

  // 1. Darhol mahalliy xotiraga saqlaymiz (UI tez ishlashi uchun)
  const localItems = readLocalExpenses();
  localItems.unshift(newRecord);
  writeLocalExpenses(localItems);

  // 2. Backendga fon rejimida yoki to'g'ridan-to'g'ri jo'natamiz
  apiClient.post(API_ENDPOINTS.EXPENSES, newRecord).catch(() => {
    // Backend o'chiq bo'lsa ham foydalanuvchiga xatolik chiqmaydi
  });

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
  };

  // Mahalliy saqlaymiz
  localItems[index] = updatedRecord;
  writeLocalExpenses(localItems);

  // Backendga yuborish
  apiClient.put(API_ENDPOINTS.EXPENSE_DETAIL(id), updatedRecord).catch(() => {});

  return updatedRecord;
}

/**
 * Tranzaksiyani o'chirish
 */
export async function deleteExpense(id) {
  const localItems = readLocalExpenses();
  const filtered = localItems.filter((item) => item.id !== id);
  writeLocalExpenses(filtered);

  // Backenddan o'chirish
  apiClient.delete(API_ENDPOINTS.EXPENSE_DETAIL(id)).catch(() => {});

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
  };

  writeLocalWallets(saved);
  apiClient.put(API_ENDPOINTS.WALLETS, saved).catch(() => {});

  return saved;
}

/**
 * Asosiy (reserve) balanslarni olish
 */
export async function getReserves() {
  return readLocalReserves();
}

/**
 * Asosiy balansni yangilash (APPEND-ONLY notes bilan)
 */
export async function updateReserve(id, { amount, noteText, exchangeRateAtTime }) {
  const reserves = readLocalReserves();
  const target = reserves[id];
  if (!target) {
    throw new Error(`Asosiy zaxira topilmadi: ${id}`);
  }

  const oldAmount = Number(target.amount || 0);
  const newAmount = Number(amount);
  const now = formatISOWithOffset(new Date());

  const existingNotes = Array.isArray(target.notes) ? [...target.notes] : [];
  const cleanNote = (noteText || "").trim() || `Balans yangilandi: ${newAmount}`;

  // APPEND-ONLY: Eski izoh o'chirilmaydi, yangi izoh qo'shiladi
  existingNotes.unshift({
    text: cleanNote,
    amount_at_that_time: newAmount,
    editedAt: now,
  });

  target.amount = newAmount;
  target.notes = existingNotes;

  writeLocalReserves(reserves);

  // Agar Dollar Asosiy bo'lsa, kurs tarixini ham saqlaymiz
  if (id === "dollar-asosiy" && newAmount !== oldAmount) {
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
