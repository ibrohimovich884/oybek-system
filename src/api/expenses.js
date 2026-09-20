/*
  Expenses and Wallets Data Layer.
  Saqlash joyi: localStorage (oybek-system).
  Boshlang'ich balanslar foydalanuvchi talabiga ko'ra:
  Naqd: 30 000 so'm
  Karta: 100 000 so'm
*/

import { generateId } from "../utils/id.js";
import { DEFAULT_WALLETS } from "../constants/money.js";
import { formatISOWithOffset } from "../utils/format.js";

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

function normalizeExpense(item) {
  const paymentMethod = item.paymentMethod || item.wallet || "naqd";
  const wallet = item.wallet || paymentMethod;
  const quantity = Number(item.quantity ?? 1);
  const spentAt = formatISOWithOffset(item.spentAt || item.createdAt || new Date());
  const createdAt = formatISOWithOffset(item.createdAt || item.spentAt || new Date());
  const edits = Array.isArray(item.edits) ? item.edits : [];

  let category = item.category || "Qorin uchun";
  let subcategory = item.subcategory || "";

  // Eski "Ichimlik" yoki "Oziq-ovqat" kategoriyasi bo'lsa yangilash
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
    // Qo'shimcha balans va o'tkazma tizimi xususiyatlari:
    type: item.type || "expense",
    wallet,
    fromWallet: item.fromWallet || null,
    toWallet: item.toWallet || null,
  };
}

function readAll() {
  const raw = localStorage.getItem(STORAGE_EXPENSES_KEY);
  if (!raw) {
    // Boshlang'ich namuna (foydalanuvchi ko'rsatgan aniq formatda)
    const initialSeed = [
      {
        id: "b3f1a2c4-1234-4a1b-9d3e-8f7a6c5d4e3f",
        amount: 10000,
        category: "Qorin uchun",
        subcategory: "Ichimlik",
        reason: "Flesh",
        location: "Gulbahordagi Havas",
        paymentMethod: "naqd",
        quantity: 1,
        spentAt: "2026-09-20T13:40:00+05:00",
        createdAt: "2026-09-20T13:52:11+05:00",
        edits: [
          {
            field: "reason",
            from: "Flesh",
            to: "Kola",
            editedAt: "2026-09-20T18:10:00+05:00",
          },
        ],
        type: "expense",
        wallet: "naqd",
      },
    ];
    localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(initialSeed));
    return initialSeed;
  }
  try {
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return [];
    return items.map(normalizeExpense);
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
    // Tizim uchun yordamchi maydonlar
    type,
    wallet: paymentMethod,
    fromWallet: payload.fromWallet || (type === "transfer" ? "karta" : null),
    toWallet: payload.toWallet || (type === "transfer" ? "naqd" : null),
  };

  items.unshift(newRecord);
  writeAll(items);
  return newRecord;
}

export async function updateExpense(id, updates) {
  const items = readAll();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Tranzaksiya topilmadi");

  const current = items[index];
  const nextEdits = Array.isArray(current.edits) ? [...current.edits] : [];
  const nowOffset = formatISOWithOffset(new Date());

  // Tahrir qilingan maydonlarni edits ro'yxatiga qayd etish
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
      const newVal =
        field === "amount" || field === "quantity"
          ? Number(updates[field])
          : updates[field];

      if (String(oldVal ?? "") !== String(newVal ?? "")) {
        nextEdits.push({
          field,
          from: oldVal ?? "",
          to: newVal,
          editedAt: nowOffset,
        });
      }
    }
  });

  const nextPaymentMethod =
    updates.paymentMethod ||
    updates.wallet ||
    current.paymentMethod ||
    current.wallet ||
    "naqd";

  const updatedRecord = {
    ...current,
    ...updates,
    amount: updates.amount !== undefined ? Number(updates.amount) : current.amount,
    quantity: updates.quantity !== undefined ? Number(updates.quantity) : (current.quantity || 1),
    paymentMethod: nextPaymentMethod,
    wallet: nextPaymentMethod,
    spentAt: updates.spentAt ? formatISOWithOffset(updates.spentAt) : current.spentAt,
    edits: nextEdits,
    editedAt: nowOffset,
  };

  items[index] = updatedRecord;
  writeAll(items);
  return updatedRecord;
}

export async function deleteExpense(id) {
  const items = readAll().filter((item) => item.id !== id);
  writeAll(items);
}

export async function exportBackup() {
  return {
    exportedAt: formatISOWithOffset(new Date()),
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
    writeAll(data.expenses.map(normalizeExpense));
  }
}

