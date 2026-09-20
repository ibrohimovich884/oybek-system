/*
  Expenses and Wallets Data Layer.
  Saqlash joyi: localStorage (oybek-system).
  Boshlang'ich balanslar foydalanuvchi talabiga ko'ra:
  Naqd: 30 000 so'm
  Karta: 100 000 so'm
*/

import { generateId } from "../utils/id.js";
import { DEFAULT_WALLETS } from "../constants/money.js";

const STORAGE_EXPENSES_KEY = "oybek-system:expenses";
const STORAGE_WALLETS_KEY = "oybek-system:wallets";

function readWallets() {
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

function writeWallets(wallets) {
  localStorage.setItem(STORAGE_WALLETS_KEY, JSON.stringify(wallets));
}

function readAll() {
  const raw = localStorage.getItem(STORAGE_EXPENSES_KEY);
  if (!raw) return [];
  try {
    const items = JSON.parse(raw);
    // Eski xarajatlar bo'lsa, type va wallet standart qiymatlarini beramiz
    return items.map((item) => ({
      type: item.type || "expense",
      wallet: item.wallet || "karta",
      category: item.category || (item.type === "income" ? "salary" : "other_expense"),
      ...item,
      amount: Number(item.amount || 0),
    }));
  } catch {
    return [];
  }
}

function writeAll(expenses) {
  localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
}

export async function getWallets() {
  return readWallets();
}

export async function updateWallets(updates) {
  const current = readWallets();
  const next = {
    naqd: updates.naqd !== undefined ? Number(updates.naqd) : current.naqd,
    karta: updates.karta !== undefined ? Number(updates.karta) : current.karta,
  };
  writeWallets(next);
  return next;
}

export async function getExpenses() {
  const items = readAll();
  return items.sort((a, b) => new Date(b.spentAt || b.createdAt) - new Date(a.spentAt || a.createdAt));
}

export async function addExpense(payload) {
  const items = readAll();
  const type = payload.type || "expense";
  const newRecord = {
    id: generateId(),
    type,
    amount: Number(payload.amount || 0),
    wallet: payload.wallet || (type === "transfer" ? "karta" : "naqd"),
    fromWallet: payload.fromWallet || (type === "transfer" ? "karta" : null),
    toWallet: payload.toWallet || (type === "transfer" ? "naqd" : null),
    category: payload.category || (type === "income" ? "salary" : type === "transfer" ? "transfer" : "other_expense"),
    reason: payload.reason?.trim() || "",
    location: payload.location?.trim() || "",
    spentAt: payload.spentAt || new Date().toISOString(),
    plannedAt: payload.plannedAt || null,
    createdAt: new Date().toISOString(),
    editedAt: null,
  };

  items.push(newRecord);
  writeAll(items);
  return newRecord;
}

export async function updateExpense(id, updates) {
  const items = readAll();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Tranzaksiya topilmadi");

  items[index] = {
    ...items[index],
    ...updates,
    amount: updates.amount !== undefined ? Number(updates.amount) : items[index].amount,
    editedAt: new Date().toISOString(),
  };
  writeAll(items);
  return items[index];
}

export async function deleteExpense(id) {
  const items = readAll().filter((item) => item.id !== id);
  writeAll(items);
}

export async function exportBackup() {
  return {
    exportedAt: new Date().toISOString(),
    wallets: readWallets(),
    expenses: readAll(),
  };
}

export async function importBackup(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Noto'g'ri fayl formati");
  }

  if (data.wallets && typeof data.wallets === "object") {
    writeWallets({
      naqd: Number(data.wallets.naqd ?? DEFAULT_WALLETS.naqd),
      karta: Number(data.wallets.karta ?? DEFAULT_WALLETS.karta),
    });
  }

  if (Array.isArray(data.expenses)) {
    writeAll(data.expenses);
  }
}
