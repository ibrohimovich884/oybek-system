import { pool } from "../../db/pool.js";
import { mapExpenseRow } from "../utils/mapExpense.js";

// Tahrirlanganda kuzatiladigan maydonlar — frontenddagi ro'yxat bilan bir xil.
const TRACKED_FIELDS = [
  "reason",
  "amount",
  "category",
  "subcategory",
  "location",
  "paymentMethod",
  "quantity",
  "spentAt",
];

const FIELD_TO_COLUMN = {
  reason: "reason",
  amount: "amount",
  category: "category",
  subcategory: "subcategory",
  location: "location",
  paymentMethod: "payment_method",
  quantity: "quantity",
  spentAt: "spent_at",
};

// Frontend har PUT'da to'liq yozuvni yuboradi. Oddiy String() taqqoslash
// spentAt (Date vs ISO satr) va amount ("5000" vs 5000) uchun har safar
// soxta "tahrir" yozib qo'yardi.
function sameValue(field, a, b) {
  if (field === "spentAt") {
    return new Date(a).getTime() === new Date(b).getTime();
  }
  if (field === "amount" || field === "quantity") {
    return Number(a) === Number(b);
  }
  return String(a ?? "") === String(b ?? "");
}

export async function getAllExpenses() {
  const { rows: transactions } = await pool.query(
    "SELECT * FROM transactions ORDER BY spent_at DESC"
  );
  const { rows: edits } = await pool.query(
    "SELECT * FROM transaction_edits ORDER BY edited_at ASC"
  );

  const editsByTransaction = new Map();
  for (const edit of edits) {
    if (!editsByTransaction.has(edit.transaction_id)) {
      editsByTransaction.set(edit.transaction_id, []);
    }
    editsByTransaction.get(edit.transaction_id).push(edit);
  }

  return transactions.map((row) =>
    mapExpenseRow(row, editsByTransaction.get(row.id) || [])
  );
}

export async function createExpense(payload) {
  const {
    id,
    type = "expense",
    amount,
    currency = "UZS",
    category,
    subcategory,
    reason,
    location,
    paymentMethod,
    wallet,
    fromWallet,
    toWallet,
    quantity = 1,
    exchangeRateAtTime,
    spentAt,
    createdAt,
  } = payload;

  const { rows } = await pool.query(
    `INSERT INTO transactions
      (id, type, amount, currency, category, subcategory, reason, location, payment_method, wallet, from_wallet, to_wallet, quantity, exchange_rate_at_time, spent_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, COALESCE($16, now()))
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [
      id,
      type,
      amount,
      currency,
      category,
      subcategory,
      reason,
      location,
      paymentMethod,
      wallet,
      fromWallet,
      toWallet,
      quantity,
      exchangeRateAtTime || null,
      spentAt,
      createdAt,
    ]
  );

  if (rows.length === 0) {
    // id allaqachon mavjud bo'lsa (masalan frontend qayta yubordi) — mavjudini qaytaramiz
    const { rows: existing } = await pool.query(
      "SELECT * FROM transactions WHERE id = $1",
      [id]
    );
    return mapExpenseRow(existing[0], []);
  }

  return mapExpenseRow(rows[0], []);
}

export async function updateExpense(id, updates) {
  const { rows: currentRows } = await pool.query(
    "SELECT * FROM transactions WHERE id = $1",
    [id]
  );
  if (currentRows.length === 0) {
    return await createExpense({ id, ...updates });
  }
  const current = currentRows[0];

  const editsToInsert = [];
  for (const field of TRACKED_FIELDS) {
    if (updates[field] === undefined) continue;
    const column = FIELD_TO_COLUMN[field];
    const oldVal = current[column];
    const newVal = updates[field];
    if (!sameValue(field, oldVal, newVal)) {
      editsToInsert.push({ field, from: oldVal, to: newVal });
    }
  }

  const setClauses = [];
  const values = [];
  let i = 1;
  for (const field of TRACKED_FIELDS) {
    if (updates[field] === undefined) continue;
    setClauses.push(`${FIELD_TO_COLUMN[field]} = $${i}`);
    values.push(updates[field]);
    i++;
  }

  if (setClauses.length > 0) {
    values.push(id);
    await pool.query(
      `UPDATE transactions SET ${setClauses.join(", ")} WHERE id = $${i}`,
      values
    );
  }

  for (const edit of editsToInsert) {
    await pool.query(
      `INSERT INTO transaction_edits (transaction_id, field, from_value, to_value)
       VALUES ($1, $2, $3, $4)`,
      [id, edit.field, String(edit.from ?? ""), String(edit.to ?? "")]
    );
  }

  const { rows: updatedRows } = await pool.query(
    "SELECT * FROM transactions WHERE id = $1",
    [id]
  );
  const { rows: edits } = await pool.query(
    "SELECT * FROM transaction_edits WHERE transaction_id = $1 ORDER BY edited_at ASC",
    [id]
  );

  return mapExpenseRow(updatedRows[0], edits);
}

export async function deleteExpense(id) {
  await pool.query("DELETE FROM transactions WHERE id = $1", [id]);
}
