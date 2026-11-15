import { pool } from "../../db/pool.js";
import { cleanWalletKey } from "./walletsService.js";
import { deleteExpense } from "./expensesService.js";

function mapDebtRow(row, payments = []) {
  return {
    id: row.id,
    personId: row.person_id || null,
    type: row.type, // 'taken' | 'given'
    personName: row.person_name,
    contact: row.contact,
    instagram: row.instagram || row.linked_instagram || "",
    telegram: row.telegram || row.linked_telegram || "",
    amount: Number(row.amount),
    currency: row.currency,
    reason: row.reason,
    location: row.location,
    personalNote: row.personal_note,
    wallet: cleanWalletKey(row.wallet),
    status: row.status, // 'pending' | 'partial' | 'settled'
    dueDate: row.due_date,
    isDueDateUnknown: Boolean(row.is_due_date_unknown),
    affectBalance: Boolean(row.affect_balance),
    synced: Boolean(row.synced),
    repaymentProbability: row.repayment_probability || "high",
    date: row.debt_date || row.created_at,
    debtDate: row.debt_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    linkedPerson: row.linked_nickname
      ? {
          id: row.person_id,
          nickname: row.linked_nickname,
          fullName: row.linked_full_name || "",
          trustLevel: row.linked_trust_level || "medium",
          phone: row.linked_phone || "",
          telegram: row.linked_telegram || "",
          instagram: row.linked_instagram || "",
        }
      : null,
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

const DEBT_SELECT_WITH_PERSON = `
  SELECT d.*,
         p.nickname AS linked_nickname,
         p.full_name AS linked_full_name,
         p.trust_level AS linked_trust_level,
         p.phone AS linked_phone,
         p.telegram AS linked_telegram,
         p.instagram AS linked_instagram
    FROM debts d
    LEFT JOIN people p ON d.person_id = p.id
`;

export async function getAllDebts(userId) {
  const debtQuery = userId
    ? `${DEBT_SELECT_WITH_PERSON} WHERE d.user_id = $1 OR d.user_id IS NULL ORDER BY d.created_at DESC`
    : `${DEBT_SELECT_WITH_PERSON} ORDER BY d.created_at DESC`;
  const debtParams = userId ? [userId] : [];

  const paymentQuery = userId
    ? `SELECT dp.* FROM debt_payments dp 
       JOIN debts d ON dp.debt_id = d.id 
       WHERE (d.user_id = $1 OR d.user_id IS NULL) 
       ORDER BY dp.paid_at DESC`
    : "SELECT * FROM debt_payments ORDER BY paid_at DESC";
  const paymentParams = userId ? [userId] : [];

  const [{ rows: debts }, { rows: payments }] = await Promise.all([
    pool.query(debtQuery, debtParams),
    pool.query(paymentQuery, paymentParams),
  ]);

  const paymentsByDebt = new Map();
  for (const p of payments) {
    if (!paymentsByDebt.has(p.debt_id)) {
      paymentsByDebt.set(p.debt_id, []);
    }
    paymentsByDebt.get(p.debt_id).push(p);
  }

  return debts.map((row) => mapDebtRow(row, paymentsByDebt.get(row.id) || []));
}

export async function getDebtById(id, userId) {
  const query = userId
    ? `${DEBT_SELECT_WITH_PERSON} WHERE d.id = $1 AND (d.user_id = $2 OR d.user_id IS NULL)`
    : `${DEBT_SELECT_WITH_PERSON} WHERE d.id = $1`;
  const params = userId ? [id, userId] : [id];

  const { rows: debts } = await pool.query(query, params);
  if (debts.length === 0) return null;

  const { rows: payments } = await pool.query(
    "SELECT * FROM debt_payments WHERE debt_id = $1 ORDER BY paid_at DESC",
    [id]
  );
  return mapDebtRow(debts[0], payments);
}

export async function createDebt(payload, userId) {
  const {
    id = `debt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    personId = null,
    type = "given",
    personName,
    contact = "",
    instagram = "",
    telegram = "",
    amount,
    currency = "UZS",
    reason = "",
    location = "",
    personalNote = "",
    wallet = "hamyon",
    status = "pending",
    dueDate = null,
    isDueDateUnknown = false,
    affectBalance = false,
    synced = true,
    repaymentProbability = "high",
    date,
    debtDate,
    createdAt,
    payments = [],
  } = payload;

  const resolvedWallet = cleanWalletKey(wallet);
  const cleanInstagram = String(instagram || "").trim().replace(/^@/, "");
  const cleanTelegram = String(telegram || "").trim().replace(/^@/, "");

  const { rows } = await pool.query(
    `INSERT INTO debts
      (id, user_id, person_id, type, person_name, contact, instagram, telegram, amount, currency, reason, location, personal_note,
       wallet, status, due_date, is_due_date_unknown, affect_balance, synced, debt_date, repayment_probability, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, COALESCE($22, now()), now())
     ON CONFLICT (id) DO UPDATE SET
       user_id = COALESCE(EXCLUDED.user_id, debts.user_id),
       person_id = EXCLUDED.person_id,
       person_name = EXCLUDED.person_name,
       contact = EXCLUDED.contact,
       instagram = EXCLUDED.instagram,
       telegram = EXCLUDED.telegram,
       amount = EXCLUDED.amount,
       currency = EXCLUDED.currency,
       reason = EXCLUDED.reason,
       location = EXCLUDED.location,
       personal_note = EXCLUDED.personal_note,
       wallet = EXCLUDED.wallet,
       status = EXCLUDED.status,
       due_date = EXCLUDED.due_date,
       is_due_date_unknown = EXCLUDED.is_due_date_unknown,
       affect_balance = EXCLUDED.affect_balance,
       synced = EXCLUDED.synced,
       repayment_probability = COALESCE(EXCLUDED.repayment_probability, debts.repayment_probability),
       updated_at = now()
     RETURNING *`,
    [
      id,
      userId || null,
      personId || null,
      type,
      personName || "Noma'lum shaxs",
      contact,
      cleanInstagram,
      cleanTelegram,
      Number(amount || 0),
      currency,
      reason,
      location,
      personalNote,
      resolvedWallet,
      status,
      isDueDateUnknown ? null : (dueDate || null),
      Boolean(isDueDateUnknown),
      Boolean(affectBalance),
      Boolean(synced),
      debtDate || date || null,
      repaymentProbability || "high",
      createdAt || null,
    ]
  );

  if (Array.isArray(payments) && payments.length > 0) {
    for (const p of payments) {
      if (p && p.amount) {
        const payId = p.id || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await pool.query(
          `INSERT INTO debt_payments (id, debt_id, user_id, amount, note, paid_at)
           VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()))
           ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, note = EXCLUDED.note, paid_at = EXCLUDED.paid_at`,
          [payId, id, userId || null, Number(p.amount), p.note || "", p.paidAt || p.date || null]
        ).catch(() => {});
      }
    }
  }

  return await getDebtById(rows[0].id, userId);
}

export async function updateDebt(id, updates, userId) {
  let current = await getDebtById(id, userId);
  if (!current) {
    return await createDebt({ id, ...updates }, userId);
  }

  const resolvedWallet = updates.wallet ? cleanWalletKey(updates.wallet) : current.wallet;
  const newStatus = updates.status !== undefined ? updates.status : current.status;
  const nextPersonId = updates.personId !== undefined ? (updates.personId || null) : (current.personId || null);
  const nextInstagram = updates.instagram !== undefined
    ? String(updates.instagram || "").trim().replace(/^@/, "")
    : (current.instagram || "");
  const nextTelegram = updates.telegram !== undefined
    ? String(updates.telegram || "").trim().replace(/^@/, "")
    : (current.telegram || "");

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
      repayment_probability = COALESCE($15, repayment_probability),
      person_id = $16,
      instagram = $17,
      telegram = $18,
      user_id = COALESCE($19, user_id),
      updated_at = now()
     WHERE id = $20 AND (user_id = $19 OR user_id IS NULL)
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
      newStatus,
      updates.isDueDateUnknown !== undefined ? Boolean(updates.isDueDateUnknown) : null,
      updates.dueDate ?? null,
      updates.affectBalance !== undefined ? Boolean(updates.affectBalance) : null,
      updates.synced !== undefined ? Boolean(updates.synced) : null,
      updates.repaymentProbability ?? null,
      nextPersonId,
      nextInstagram,
      nextTelegram,
      userId || null,
      id,
    ]
  );

  let updatedRow = rows[0];
  if (!updatedRow) {
    return await createDebt({ id, ...updates }, userId);
  }

  if (Array.isArray(updates.payments)) {
    for (const p of updates.payments) {
      if (p && p.amount) {
        const payId = p.id || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await pool.query(
          `INSERT INTO debt_payments (id, debt_id, user_id, amount, note, paid_at)
           VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()))
           ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, note = EXCLUDED.note, paid_at = EXCLUDED.paid_at`,
          [payId, id, userId || null, Number(p.amount), p.note || "", p.paidAt || p.date || null]
        ).catch(() => {});
      }
    }
  }

  return await getDebtById(id, userId);
}

export async function addDebtPayment(debtId, payment, userId) {
  let debt = await getDebtById(debtId, userId);
  if (!debt) {
    if (payment.debtData) {
      await createDebt({ id: debtId, ...payment.debtData }, userId);
      debt = await getDebtById(debtId, userId);
    }
  }
  if (!debt) {
    await createDebt({
      id: debtId,
      personName: payment.personName || "Noma'lum qarz",
      amount: Number(payment.amount || 0),
      wallet: payment.wallet || "hamyon",
      status: "partial",
    }, userId);
    debt = await getDebtById(debtId, userId);
  }

  let paymentRow = null;
  const paymentAmount = Number(payment.amount || 0);

  if (paymentAmount > 0) {
    const paymentId = payment.id || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const { rows } = await pool.query(
      `INSERT INTO debt_payments (id, debt_id, user_id, amount, note, paid_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()))
       ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, note = EXCLUDED.note, paid_at = EXCLUDED.paid_at
       RETURNING *`,
      [paymentId, debtId, userId || null, paymentAmount, payment.note || "", payment.paidAt || payment.date || null]
    );
    paymentRow = rows[0];
  }

  // Statusni tekshirib yangilaymiz
  const updatedDebt = await getDebtById(debtId, userId);
  if (updatedDebt) {
    const totalPaid = (updatedDebt.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    let newStatus = "partial";
    if (totalPaid >= updatedDebt.amount || payment.markSettled || payment.status === "settled") {
      newStatus = "settled";
    } else if (totalPaid <= 0) {
      newStatus = "pending";
    }

    await pool.query("UPDATE debts SET status = $1, updated_at = now() WHERE id = $2", [
      newStatus,
      debtId,
    ]);
  }

  return paymentRow || { id: `pay_${Date.now()}`, debt_id: debtId, amount: paymentAmount };
}

export async function settleDebt(debtId, payload = {}, userId) {
  let debt = await getDebtById(debtId, userId);
  if (!debt) {
    if (payload.debtData) {
      await createDebt({ id: debtId, ...payload.debtData }, userId);
      debt = await getDebtById(debtId, userId);
    }
  }

  const paymentAmount = Number(payload.amount || 0);
  if (paymentAmount > 0) {
    const paymentId = payload.paymentId || payload.id || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(
      `INSERT INTO debt_payments (id, debt_id, user_id, amount, note, paid_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()))
       ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, note = EXCLUDED.note, paid_at = EXCLUDED.paid_at`,
      [paymentId, debtId, userId || null, paymentAmount, payload.note || "To'liq yopildi deb belgilandi", payload.date || null]
    ).catch(() => {});
  }

  await pool.query(
    "UPDATE debts SET status = 'settled', updated_at = now() WHERE id = $1",
    [debtId]
  );

  return await getDebtById(debtId, userId);
}

export async function forgiveDebt(debtId, payload = {}, userId) {
  let debt = await getDebtById(debtId, userId);
  if (!debt) {
    if (payload.debtData) {
      await createDebt({ id: debtId, ...payload.debtData }, userId);
      debt = await getDebtById(debtId, userId);
    }
  }

  const paid = (debt?.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const remaining = Math.max(0, Number(debt?.amount || 0) - paid);
  const forgiveAmount = payload.amount !== undefined ? Number(payload.amount) : remaining;

  if (forgiveAmount > 0) {
    const paymentId = payload.paymentId || payload.id || `pay_forgive_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(
      `INSERT INTO debt_payments (id, debt_id, user_id, amount, note, paid_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()))
       ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, note = EXCLUDED.note, paid_at = EXCLUDED.paid_at`,
      [
        paymentId,
        debtId,
        userId || null,
        forgiveAmount,
        payload.note || "Qarzdan voz kechildi (Kechib yuborildi)",
        payload.date || null,
      ]
    ).catch(() => {});
  }

  await pool.query(
    "UPDATE debts SET status = 'forgiven', updated_at = now() WHERE id = $1",
    [debtId]
  );

  return await getDebtById(debtId, userId);
}

export async function deleteDebt(id, userId, { revertTransactions = false } = {}) {
  if (revertTransactions) {
    try {
      const debt = await getDebtById(id, userId);
      const txQuery = userId
        ? `SELECT id FROM transactions 
           WHERE (user_id = $1 OR user_id IS NULL) 
             AND (debt_id = $2 OR (debt_id IS NULL AND ($3::text IS NOT NULL AND position(lower($3) in lower(reason)) > 0 AND subcategory IN ('Qarz berish', 'Qarz olish', 'Qarz qaytishi', 'Qarz to''lash'))))`
        : `SELECT id FROM transactions 
           WHERE debt_id = $1 
              OR (debt_id IS NULL AND ($2::text IS NOT NULL AND position(lower($2) in lower(reason)) > 0 AND subcategory IN ('Qarz berish', 'Qarz olish', 'Qarz qaytishi', 'Qarz to''lash')))`;
      const txParams = userId ? [userId, id, debt?.personName || null] : [id, debt?.personName || null];
      const { rows: linkedTxs } = await pool.query(txQuery, txParams);
      for (const tx of linkedTxs) {
        await deleteExpense(tx.id, userId);
      }
    } catch (err) {
      console.warn("Reverting linked transactions error:", err.message);
    }
  }

  if (userId) {
    await pool.query("DELETE FROM debts WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)", [id, userId]);
  } else {
    await pool.query("DELETE FROM debts WHERE id = $1", [id]);
  }
}
