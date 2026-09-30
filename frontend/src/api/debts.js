import { generateId } from "../utils/id.js";
import { formatISOWithOffset } from "../utils/format.js";
import { scheduleSnapshotPush, pushSnapshot, pullSnapshotFromDB } from "../services/snapshotSync.js";
import { syncService } from "../services/syncService.js";

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
  scheduleSnapshotPush();
}

/**
 * Qarzlar ro'yxatini olish (DB asosiy manba sifatida, oflayn rejimda lokal kesh)
 */
export async function getDebts() {
  try {
    const pulled = await pullSnapshotFromDB();
    if (pulled && Array.isArray(pulled.pendingDebts)) {
      return pulled.pendingDebts;
    }
  } catch (err) {
    console.warn("DBdan qarzlarni olishda ogohlantirish (lokal xotira ishlatiladi):", err);
  }
  return readLocalDebts();
}

/**
 * Yangi qarz qo'shish (Sinxronizatsiya navbatiga olinadi va DB app_snapshot jadvaliga yoziladi)
 */
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
    reason: debtData.reason?.trim() || "",
    dueDate: debtData.isDueDateUnknown ? null : (debtData.dueDate || null),
    isDueDateUnknown: Boolean(debtData.isDueDateUnknown),
    personalNote: debtData.personalNote?.trim() || "",
    status: "pending", // "pending" | "partial" | "settled"
    payments: [],
    synced: false,
    createdAt: formatISOWithOffset(new Date()),
    updatedAt: formatISOWithOffset(new Date()),
  };

  debts.unshift(newDebt);
  writeLocalDebts(debts);

  // 1. Sinxronizatsiya navbatiga qo'shish
  const queueEntry = syncService.addToQueue({
    entity: "debts",
    type: "create",
    targetId: newDebt.id,
    payload: newDebt,
  });

  // 2. Darhol DBga yuborishga urinish
  pushSnapshot()
    .then((res) => {
      if (res && res.ok) {
        newDebt.synced = true;
        syncService.removeFromQueue(queueEntry.queueId);
        syncService.addLog("success", `Qarz DBga saqlandi: ${newDebt.personName} (${newDebt.amount})`);
        markDebtSynced(newDebt.id, true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("oybek:item-synced", { detail: { id: newDebt.id } }));
        }
      }
    })
    .catch(() => {});

  return newDebt;
}

export function markDebtSynced(debtId, isSynced = true) {
  const debts = readLocalDebts();
  const updated = debts.map((d) => (d.id === debtId ? { ...d, synced: isSynced } : d));
  localStorage.setItem(STORAGE_PENDING_DEBTS_KEY, JSON.stringify(updated));
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

  const queueEntry = syncService.addToQueue({
    entity: "debts",
    type: "update",
    targetId: id,
    payload: updated,
  });

  pushSnapshot()
    .then((res) => {
      if (res && res.ok) {
        updated.synced = true;
        syncService.removeFromQueue(queueEntry.queueId);
        syncService.addLog("success", `Qarz yangilanishi DBga saqlandi: ${updated.personName}`);
        markDebtSynced(id, true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("oybek:item-synced", { detail: { id } }));
        }
      }
    })
    .catch(() => {});

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
    synced: false,
    updatedAt: formatISOWithOffset(new Date()),
  };

  debts[index] = updatedDebt;
  writeLocalDebts(debts);

  const queueEntry = syncService.addToQueue({
    entity: "debts",
    type: "update",
    targetId: id,
    payload: updatedDebt,
  });

  pushSnapshot()
    .then((res) => {
      if (res && res.ok) {
        updatedDebt.synced = true;
        syncService.removeFromQueue(queueEntry.queueId);
        syncService.addLog("success", `Qarz to'lovi DBga saqlandi: ${debt.personName} (+${paymentAmount})`);
        markDebtSynced(id, true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("oybek:item-synced", { detail: { id } }));
        }
      }
    })
    .catch(() => {});

  return { updatedDebt, payment: newPayment };
}

export async function deleteDebtRecord(id) {
  const debts = readLocalDebts();
  const filtered = debts.filter((d) => d.id !== id);
  writeLocalDebts(filtered);

  const queueEntry = syncService.addToQueue({
    entity: "debts",
    type: "delete",
    targetId: id,
    payload: { id },
  });

  pushSnapshot()
    .then((res) => {
      if (res && res.ok) {
        syncService.removeFromQueue(queueEntry.queueId);
        syncService.addLog("success", `Qarz DBdan ham o'chirildi (ID: ${id})`);
      }
    })
    .catch(() => {});

  return true;
}
