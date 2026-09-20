/*
  Expenses data layer.

  HOZIRGI HOLAT: ma'lumotlar brauzerning localStorage'ida saqlanadi
  (backend/Neon hali ulanmagan).

  KEYINGI BOSQICH: har bir funksiya ichini fetch("http://localhost:PORT/api/...")
  chaqiruviga almashtirasiz. Funksiya nomlari va qaytaradigan narsalari
  (imzolari) shu tarzda qoladi, shuning uchun komponentlarni (ExpensesContext)
  o'zgartirishga hojat qolmaydi — faqat shu faylni yangilaysiz.
*/

import { generateId } from "../utils/id.js";

const STORAGE_KEY = "oybek-system:expenses";

function readAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAll(expenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export async function getExpenses() {
  return readAll().sort(
    (a, b) => new Date(b.spentAt) - new Date(a.spentAt)
  );
}

export async function addExpense({ amount, reason, location, spentAt, plannedAt }) {
  const expenses = readAll();
  const newExpense = {
    id: generateId(),
    amount: Number(amount),
    reason: reason?.trim() || "",
    location: location?.trim() || "",
    spentAt: spentAt || new Date().toISOString(),
    plannedAt: plannedAt || null,
    createdAt: new Date().toISOString(),
    editedAt: null,
  };
  expenses.push(newExpense);
  writeAll(expenses);
  return newExpense;
}

export async function updateExpense(id, updates) {
  const expenses = readAll();
  const index = expenses.findIndex((expense) => expense.id === id);
  if (index === -1) throw new Error("Xarajat topilmadi");

  expenses[index] = {
    ...expenses[index],
    ...updates,
    amount:
      updates.amount !== undefined ? Number(updates.amount) : expenses[index].amount,
    editedAt: new Date().toISOString(),
  };
  writeAll(expenses);
  return expenses[index];
}

export async function deleteExpense(id) {
  const expenses = readAll().filter((expense) => expense.id !== id);
  writeAll(expenses);
}

export async function exportBackup() {
  return {
    exportedAt: new Date().toISOString(),
    expenses: readAll(),
  };
}
