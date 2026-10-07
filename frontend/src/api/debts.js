import { generateId } from "../utils/id.js";
import { formatISOWithOffset } from "../utils/format.js";
import { syncService } from "../services/syncService.js";
import { apiClient } from "./client.js";
import { getUserStorageKey } from "../utils/storageKeys.js";

const BASE_PENDING_DEBTS_KEY = "oybek-system:pending_debts";

export function readLocalDebts() {
  if (typeof window === "undefined") return [];
  const storageKey = getUserStorageKey(BASE_PENDING_DEBTS_KEY);
  const raw = localStorage.getItem(storageKey);
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
  const storageKey = getUserStorageKey(BASE_PENDING_DEBTS_KEY);
  localStorage.setItem(storageKey, JSON.stringify(debts));
}

/**
 * Qarzlar ro'yxatini olish (Backend /api/debts yoki lokal kesh)
 */
export async function getDebts() {
  const localDebts = readLocalDebts();
  const unsyncedLocals = localDebts.filter((d) => d.synced === false);

  // 1. REST /api/debts endpointi
  try {
    const res = await apiClient.get("/api/debts");
    if (res.ok && Array.isArray(res.data)) {
      const serverDebts = res.data.map((d) => ({ ...d, synced: true }));
      
      const debtMap = new Map();
      serverDebts.forEach((d) => debtMap.set(d.id, d));

      // Unsynced local debts va ularning to'lovlarini saqlab qolamiz
      unsyncedLocals.forEach((localD) => {
        const serverD = debtMap.get(localD.id);
        if (serverD) {
          const serverPayments = serverD.payments || [];
          const localPayments = localD.payments || [];
          const payMap = new Map();
          serverPayments.forEach((p) => payMap.set(p.id, p));
          localPayments.forEach((p) => payMap.set(p.id, p));

          debtMap.set(localD.id, {
            ...serverD,
            ...localD,
            payments: Array.from(payMap.values()),
            synced: false,
          });
        } else {
          debtMap.set(localD.id, localD);
        }
      });

      const merged = Array.from(debtMap.values());
      merged.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      writeLocalDebts(merged);
      return merged;
    }
  } catch (err) {
    console.warn("/api/debts dan olishda ogohlantirish (lokal xotira ishlatiladi):", err);
  }

  return localDebts;
}

/**
 * Yangi qarz qo'shish (Sinxronizatsiya navbatiga olinadi va DB debts ga yoziladi)
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

  // 2. REST API /api/debts ga yuborish
  try {
    const res = await apiClient.post("/api/debts", newDebt);
    if (res && res.ok) {
      newDebt.synced = true;
      syncService.removeFromQueue(queueEntry.queueId);
      syncService.addLog("success", `Qarz DBga saqlandi: ${newDebt.personName} (${newDebt.amount})`);
      markDebtSynced(newDebt.id, true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oybek:item-synced", { detail: { id: newDebt.id } }));
      }
    }
  } catch (err) {
    console.warn("Debt post error:", err);
  }

  return newDebt;
}

export function markDebtSynced(debtId, isSynced = true) {
  const debts = readLocalDebts();
  const updated = debts.map((d) => (d.id === debtId ? { ...d, synced: isSynced } : d));
  writeLocalDebts(updated);
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

  try {
    const res = await apiClient.put(`/api/debts/${id}`, updated);
    if (res && res.ok) {
      updated.synced = true;
      syncService.removeFromQueue(queueEntry.queueId);
      syncService.addLog("success", `Qarz yangilanishi DBga saqlandi: ${updated.personName}`);
      markDebtSynced(id, true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oybek:item-synced", { detail: { id } }));
      }
    }
  } catch (err) {
    console.warn("Debt update error:", err);
  }

  return updated;
}

export async function recordDebtPayment(id, paymentData) {
  const debts = readLocalDebts();
  const index = debts.findIndex((d) => d.id === id);
  if (index === -1) throw new Error("Qarz topilmadi");

  const debt = debts[index];
  const paymentAmount = Number(paymentData.amount || 0);

  const newPayment = paymentAmount > 0 ? {
    id: generateId(),
    amount: paymentAmount,
    date: formatISOWithOffset(paymentData.date || new Date()),
    wallet: paymentData.wallet || debt.wallet || "naqd",
    affectBalance: Boolean(paymentData.affectBalance),
    note: paymentData.note?.trim() || "",
    createdAt: formatISOWithOffset(new Date()),
  } : null;

  const payments = newPayment ? [newPayment, ...(debt.payments || [])] : [...(debt.payments || [])];
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  let status = "partial";
  if (totalPaid >= debt.amount || paymentData.status === "settled" || paymentData.markSettled) {
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

  try {
    if (status === "settled") {
      const res = await apiClient.put(`/api/debts/${id}/settle`, {
        ...paymentData,
        id: newPayment?.id,
        amount: paymentAmount,
        debtData: debt,
      });
      if (res && res.ok) {
        updatedDebt.synced = true;
        updatedDebt.status = "settled";
        syncService.removeFromQueue(queueEntry.queueId);
        syncService.addLog("success", `Qarz to'liq yopildi: ${debt.personName}`);
        markDebtSynced(id, true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("oybek:item-synced", { detail: { id } }));
        }
      }
    } else if (newPayment) {
      const res = await apiClient.post(`/api/debts/${id}/payments`, {
        ...newPayment,
        debtData: debt,
        markSettled: false,
      });
      if (res && res.ok) {
        updatedDebt.synced = true;
        syncService.removeFromQueue(queueEntry.queueId);
        syncService.addLog("success", `Qarz to'lovi DBga saqlandi: ${debt.personName} (+${paymentAmount})`);
        markDebtSynced(id, true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("oybek:item-synced", { detail: { id } }));
        }
      }
    } else {
      const res = await apiClient.put(`/api/debts/${id}`, updatedDebt);
      if (res && res.ok) {
        updatedDebt.synced = true;
        syncService.removeFromQueue(queueEntry.queueId);
        markDebtSynced(id, true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("oybek:item-synced", { detail: { id } }));
        }
      }
    }
  } catch (err) {
    console.warn("Payment recording network error:", err);
  }

  return { updatedDebt, payment: newPayment || { amount: 0, date: new Date().toISOString() } };
}

export async function settleDebtApi(id, customOpts = {}) {
  return await recordDebtPayment(id, {
    ...customOpts,
    status: "settled",
    markSettled: true,
  });
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

  try {
    const res = await apiClient.delete(`/api/debts/${id}`);
    if (res && res.ok) {
      syncService.removeFromQueue(queueEntry.queueId);
      syncService.addLog("success", `Qarz DBdan ham o'chirildi (ID: ${id})`);
    }
  } catch (err) {
    console.warn("Delete debt network error:", err);
  }

  return true;
}
