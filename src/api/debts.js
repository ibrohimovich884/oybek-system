import { generateId } from "../utils/id.js";
import { formatISOWithOffset } from "../utils/format.js";

const STORAGE_PENDING_DEBTS_KEY = "oybek-system:pending_debts";

export function readLocalDebts() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_PENDING_DEBTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((d) => ({
      ...d,
      synced: d.synced !== undefined ? Boolean(d.synced) : true,
    }));
  } catch {
    return [];
  }
}

export function writeLocalDebts(debts) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_PENDING_DEBTS_KEY, JSON.stringify(debts));
}

export async function getDebts() {
  return readLocalDebts();
}

export async function addDebtRecord(debtData) {
  const debts = readLocalDebts();
  const newDebt = {
    id: generateId(),
    type: debtData.type || "given", // "given" | "taken"
    personName: debtData.personName?.trim() || "Noma'lum shaxs",
    contact: debtData.contact?.trim() || "",
    amount: Number(debtData.amount || 0),
    currency: debtData.currency || "UZS", // "UZS" | "USD"
    wallet: debtData.wallet || "naqd",
    affectBalance: Boolean(debtData.affectBalance),
    date: formatISOWithOffset(debtData.date || new Date()),
    location: debtData.location?.trim() || "",
    reason: debtData.reason?.trim() || "", // U nima uchun olgani / Olish maqsadim
    dueDate: debtData.isDueDateUnknown ? null : (debtData.dueDate || null),
    isDueDateUnknown: Boolean(debtData.isDueDateUnknown),
    personalNote: debtData.personalNote?.trim() || "", // O'zim uchun eslatma
    status: "pending", // "pending" | "partial" | "settled"
    payments: [],
    synced: false, // Yangi qarz avval xotiraga yoziladi
    createdAt: formatISOWithOffset(new Date()),
    updatedAt: formatISOWithOffset(new Date()),
  };

  debts.unshift(newDebt);
  writeLocalDebts(debts);
  return newDebt;
}

export async function updateDebtRecord(id, updates) {
  const debts = readLocalDebts();
  const index = debts.findIndex((d) => d.id === id);
  if (index === -1) throw new Error("Qarz topilmadi");

  const existing = debts[index];
  const updated = {
    ...existing,
    ...updates,
    synced: false,
    updatedAt: formatISOWithOffset(new Date()),
  };

  debts[index] = updated;
  writeLocalDebts(debts);
  return updated;
}

export async function recordDebtPayment(id, paymentData) {
  const debts = readLocalDebts();
  const index = debts.findIndex((d) => d.id === id);
  if (index === -1) throw new Error("Qarz topilmadi");

  const debt = debts[index];
  const paymentAmount = Number(paymentData.amount || 0);
  if (paymentAmount <= 0) throw new Error("To'lov summasi 0 dan katta bo'lishi kerak");

  const newPayment = {
    id: generateId(),
    amount: paymentAmount,
    date: formatISOWithOffset(paymentData.date || new Date()),
    wallet: paymentData.wallet || debt.wallet || "naqd",
    affectBalance: Boolean(paymentData.affectBalance),
    note: paymentData.note?.trim() || "",
    createdAt: formatISOWithOffset(new Date()),
  };

  const payments = [newPayment, ...(debt.payments || [])];
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  let status = "partial";
  if (totalPaid >= debt.amount) {
    status = "settled";
  } else if (totalPaid <= 0) {
    status = "pending";
  }

  const updatedDebt = {
    ...debt,
    payments,
    status,
    updatedAt: formatISOWithOffset(new Date()),
  };

  debts[index] = updatedDebt;
  writeLocalDebts(debts);
  return { updatedDebt, payment: newPayment };
}

export async function deleteDebtRecord(id) {
  const debts = readLocalDebts();
  const filtered = debts.filter((d) => d.id !== id);
  writeLocalDebts(filtered);
  return true;
}
