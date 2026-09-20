/**
 * Expenses and Wallets Data Layer (OYBEK SysteM)
 * 
 * Strukturaviy xavfsizlik:
 * - Foydalanuvchi faqat backend portini kiritishi kifoya.
 * - Backend o'chiq bo'lsa ham frontendda xatolik chiqmaydi (fallback to localStorage).
 * - Backend yoqilishi bilan avtomatik unga ulanadi va sinxronizatsiya qiladi.
 */

import { generateId } from "../utils/id.js";
import { DEFAULT_WALLETS } from "../constants/money.js";
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
      naqd: Number(parsed.naqd ?? DEFAULT_WALLETS.naqd),
      karta: Number(parsed.karta ?? DEFAULT_WALLETS.karta),
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
 * Tranzaksiya ma'lumotlarini to'liq va xatosiz standartga keltirish
 */
export function normalizeExpense(item) {
  const paymentMethod = item.paymentMethod || item.wallet || "naqd";
  const wallet = item.wallet || paymentMethod;
  const quantity = Number(item.quantity ?? 1);
  const spentAt = formatISOWithOffset(item.spentAt || item.createdAt || new Date());
  const createdAt = formatISOWithOffset(item.createdAt || item.spentAt || new Date());
  const edits = Array.isArray(item.edits) ? item.edits : [];

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
    naqd: Number(updates.naqd !== undefined ? updates.naqd : current.naqd),
    karta: Number(updates.karta !== undefined ? updates.karta : current.karta),
  };

  writeLocalWallets(saved);
  apiClient.put(API_ENDPOINTS.WALLETS, saved).catch(() => {});

  return saved;
}

/**
 * Zaxira nusxa (Backup) eksporti
 */
export async function exportBackup() {
  const expenses = await getExpenses();
  const wallets = await getWallets();

  return {
    version: "2.0.0",
    exportedAt: new Date().toISOString(),
    backendPort: getBackendPort(),
    wallets,
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
