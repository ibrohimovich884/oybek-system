import { pool } from "../../db/pool.js";
import { canonicalWalletId } from "./walletsService.js";

function mapDebtRow(row, payments = []) {
  return {
    id: row.id,
    type: row.type, // 'taken' | 'given'
    personName: row.person_name,
    contact: row.contact,
    amount: Number(row.amount),
    currency: row.currency,
    reason: row.reason,
    location: row.location,
    personalNote: row.personal_note,
    wallet: row.wallet,
    status: row.status, // 'pending' | 'partial' | 'settled'
    dueDate: row.due_date,
    isDueDateUnknown: Boolean(row.is_due_date_unknown),
    affectBalance: Boolean(row.affect_balance),
    synced: Boolean(row.synced),
    date: row.debt_date || row.created_at,
    debtDate: row.debt_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payments: payments.map((p) => ({
      id: p.id,
      debtId: p.debt_id,
      amount: Number(p.amount),
      note: p.note,
      date: p.paid_at,
      paidAt: p.paid_at,
    })),
  };
}

export async function getAllDebts() {
  const { rows: debts } = await pool.query(
    "SELECT * FROM debts ORDER BY created_at DESC"
  );
  const { rows: payments } = await pool.query(
    "SELECT * FROM debt_payments ORDER BY paid_at DESC"
  );

  const paymentsByDebt = new Map();
  for (const p of payments) {
    if (!paymentsByDebt.has(p.debt_id)) {
      paymentsByDebt.set(p.debt_id, []);
    }
    paymentsByDebt.get(p.debt_id).push(p);
  }

  return debts.map((row) => mapDebtRow(row, paymentsByDebt.get(row.id) || []));
}

export async function getDebtById(id) {
  const { rows: debts } = await pool.query(
    "SELECT * FROM debts WHERE id = $1",
    [id]
  );
  if (debts.length === 0) return null;
  const { rows: payments } = await pool.query(
    "SELECT * FROM debt_payments WHERE debt_id = $1 ORDER BY paid_at DESC",
    [id]
  );
  return mapDebtRow(debts[0], payments);
}

export async function createDebt(payload) {
  const {
    id,
    type = "given",
    personName,
    contact = "",
    amount,
    currency = "UZS",
    reason = "",
    location = "",
    personalNote = "",
    wallet = "naqd",
    status = "pending",
    dueDate = null,
    isDueDateUnknown = false,
    affectBalance = false,
    synced = true,
    date,
    debtDate,
    createdAt,
  } = payload;

  const resolvedWallet = canonicalWalletId(wallet);

  const { rows } = await pool.query(
    `INSERT INTO debts
      (id, type, person_name, contact, amount, currency, reason, location, personal_note,
       wallet, status, due_date, is_due_date_unknown, affect_balance, synced, debt_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, COALESCE($17, now()), now())
     ON CONFLICT (id) DO UPDATE SET
       person_name = EXCLUDED.person_name,
       amount = EXCLUDED.amount,
       status = EXCLUDED.status,
       updated_at = now()
     RETURNING *`,
    [
      id,
      type,
      personName,
      contact,
      amount,
      currency,
      reason,
      location,
      personalNote,
      resolvedWallet,
      status,
      isDueDateUnknown ? null : (dueDate || null),
      isDueDateUnknown,
      affectBalance,
      synced,
      debtDate || date || null,
      createdAt || null,
    ]
  );

  return mapDebtRow(rows[0], []);
}

export async function updateDebt(id, updates) {
  const current = await getDebtById(id);
  if (!current) {
    return await createDebt({ id, ...updates });
  }

  const resolvedWallet = updates.wallet ? canonicalWalletId(updates.wallet) : current.wallet;

  const { rows } = await pool.query(
    `UPDATE debts SET
      type = COALESCE($1, type),
      person_name = COALESCE($2, person_name),
      contact = COALESCE($3, contact),
      amount = COALESCE($4, amount),
      currency = COALESCE($5, currency),
      reason = COALESCE($6, reason),
      location = COALESCE($7, location),
      personal_note = COALESCE($8, personal_note),
      wallet = COALESCE($9, wallet),
      status = COALESCE($10, status),
      due_date = CASE WHEN $11::boolean = true THEN NULL ELSE COALESCE($12, due_date) END,
      is_due_date_unknown = COALESCE($11, is_due_date_unknown),
      affect_balance = COALESCE($13, affect_balance),
      synced = COALESCE($14, synced),
      updated_at = now()
     WHERE id = $15
     RETURNING *`,
    [
      updates.type ?? null,
      updates.personName ?? null,
      updates.contact ?? null,
      updates.amount !== undefined ? Number(updates.amount) : null,
      updates.currency ?? null,
      updates.reason ?? null,
      updates.location ?? null,
      updates.personalNote ?? null,
      resolvedWallet,
      updates.status ?? null,
      updates.isDueDateUnknown !== undefined ? Boolean(updates.isDueDateUnknown) : null,
      updates.dueDate ?? null,
      updates.affectBalance !== undefined ? Boolean(updates.affectBalance) : null,
      updates.synced !== undefined ? Boolean(updates.synced) : null,
      id,
    ]
  );

  const { rows: payments } = await pool.query(
    "SELECT * FROM debt_payments WHERE debt_id = $1 ORDER BY paid_at DESC",
    [id]
  );

  return mapDebtRow(rows[0], payments);
}

export async function addDebtPayment(debtId, payment) {
  const { id, amount, note = "", date, paidAt } = payment;
  const { rows } = await pool.query(
    `INSERT INTO debt_payments (id, debt_id, amount, note, paid_at)
     VALUES ($1, $2, $3, $4, COALESCE($5, now()))
     RETURNING *`,
    [id, debtId, Number(amount), note, paidAt || date || null]
  );

  // Statusni tekshirib yangilaymiz
  const debt = await getDebtById(debtId);
  if (debt) {
    const totalPaid = (debt.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    let newStatus = "partial";
    if (totalPaid >= debt.amount) newStatus = "settled";
    else if (totalPaid <= 0) newStatus = "pending";

    if (newStatus !== debt.status) {
      await pool.query("UPDATE debts SET status = $1, updated_at = now() WHERE id = $2", [
        newStatus,
        debtId,
      ]);
    }
  }

  return rows[0];
}

export async function deleteDebt(id) {
  await pool.query("DELETE FROM debts WHERE id = $1", [id]);
}
