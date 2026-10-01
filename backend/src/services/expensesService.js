import { pool } from "../../db/pool.js";
import { mapExpenseRow } from "../utils/mapExpense.js";
import { canonicalWalletId } from "./walletsService.js";

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
  "type",
  "wallet",
  "fromWallet",
  "toWallet",
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
  type: "type",
  wallet: "wallet",
  fromWallet: "from_wallet",
  toWallet: "to_wallet",
};

function sameValue(field, a, b) {
  if (field === "spentAt") {
    return new Date(a).getTime() === new Date(b).getTime();
  }
  if (field === "amount" || field === "quantity") {
    return Number(a) === Number(b);
  }
  return String(a ?? "") === String(b ?? "");
}

/**
 * Tranzaksiya ta'sirini wallets jadvaliga qo'llash yoki qaytarish
 * multiplier = 1 (qo'llash), multiplier = -1 (bekor qilish/qaytarish)
 */
async function applyWalletBalanceChange(client, tx, multiplier = 1) {
  const type = tx.type || "expense";
  const amount = Number(tx.amount || 0);
  if (!amount || isNaN(amount)) return;

  const wallet = canonicalWalletId(tx.wallet || tx.payment_method || tx.paymentMethod);
  const fromWallet = canonicalWalletId(tx.from_wallet || tx.fromWallet);
  const toWallet = canonicalWalletId(tx.to_wallet || tx.toWallet);

  if (type === "expense") {
    if (wallet) {
      await client.query(
        "UPDATE wallets SET balance = balance - ($1 * $2) WHERE id = $3",
        [amount, multiplier, wallet]
      );
    }
  } else if (type === "income") {
    if (wallet) {
      await client.query(
        "UPDATE wallets SET balance = balance + ($1 * $2) WHERE id = $3",
        [amount, multiplier, wallet]
      );
    }
  } else if (type === "transfer") {
    const targetAmount = Number(tx.target_amount ?? tx.targetAmount ?? amount);
    if (fromWallet) {
      await client.query(
        "UPDATE wallets SET balance = balance - ($1 * $2) WHERE id = $3",
        [amount, multiplier, fromWallet]
      );
    }
    if (toWallet) {
      await client.query(
        "UPDATE wallets SET balance = balance + ($1 * $2) WHERE id = $3",
        [targetAmount, multiplier, toWallet]
      );
    }
  }
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

  const resolvedWallet = canonicalWalletId(wallet || paymentMethod);
  const resolvedFromWallet = fromWallet ? canonicalWalletId(fromWallet) : null;
  const resolvedToWallet = toWallet ? canonicalWalletId(toWallet) : null;
  const resolvedPaymentMethod = paymentMethod ? canonicalWalletId(paymentMethod) : resolvedWallet;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
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
        resolvedPaymentMethod,
        resolvedWallet,
        resolvedFromWallet,
        resolvedToWallet,
        quantity,
        exchangeRateAtTime || null,
        spentAt,
        createdAt,
      ]
    );

    if (rows.length > 0) {
      // 1. Yangi tranzaksiya kiritildi -> wallets jadvalidagi balansni o'zgartiramiz
      await applyWalletBalanceChange(client, rows[0], 1);

      // 2. DARHOL COMMIT qilamiz — tranzaksiya va balans DBga 100% muvaffaqiyatli yozildi
      await client.query("COMMIT");

      // 3. Agar transfer bo'lsa va zaxira hisob qatnashgan bo'lsa, wallet_notes ga alohida xavfsiz yozib qo'yamiz (tranzaksiyaga ta'sir qilmaydi)
      if (type === "transfer") {
        const transferNote = reason?.trim() || `${resolvedFromWallet} dan ${resolvedToWallet} ga o'tkazma`;
        const isReserveWallet = (w) => w && (w.endsWith("_reserve") || w.endsWith("-asosiy"));

        if (isReserveWallet(resolvedToWallet)) {
          pool.query(
            `INSERT INTO wallet_notes (wallet_id, text, amount_at_time, edited_at)
             VALUES ($1, $2, (SELECT balance FROM wallets WHERE id = $1), now())`,
            [resolvedToWallet, `O'tkazma: +${amount} (${transferNote})`]
          ).catch((e) => console.warn("To-reserve note error:", e.message));
        }

        if (isReserveWallet(resolvedFromWallet)) {
          pool.query(
            `INSERT INTO wallet_notes (wallet_id, text, amount_at_time, edited_at)
             VALUES ($1, $2, (SELECT balance FROM wallets WHERE id = $1), now())`,
            [resolvedFromWallet, `O'tkazma: -${amount} (${transferNote})`]
          ).catch((e) => console.warn("From-reserve note error:", e.message));
        }
      }

      return mapExpenseRow(rows[0], []);
    }

    // Agar id allaqachon mavjud bo'lsa
    await client.query("COMMIT");
    const { rows: existing } = await pool.query(
      "SELECT * FROM transactions WHERE id = $1",
      [id]
    );
    return mapExpenseRow(existing[0], []);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function updateExpense(id, updates) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: currentRows } = await client.query(
      "SELECT * FROM transactions WHERE id = $1 FOR UPDATE",
      [id]
    );
    if (currentRows.length === 0) {
      await client.query("COMMIT");
      return await createExpense({ id, ...updates });
    }
    const current = currentRows[0];

    // 1. Eski tranzaksiyaning hamyondagi ta'sirini bekor qilamiz (-1)
    await applyWalletBalanceChange(client, current, -1);

    const editsToInsert = [];
    for (const field of TRACKED_FIELDS) {
      if (updates[field] === undefined) continue;
      const column = FIELD_TO_COLUMN[field];
      if (!column) continue;
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
      const column = FIELD_TO_COLUMN[field];
      if (!column) continue;
      let val = updates[field];
      if (field === "wallet" || field === "fromWallet" || field === "toWallet" || field === "paymentMethod") {
        val = canonicalWalletId(val);
      }
      setClauses.push(`${column} = $${i}`);
      values.push(val);
      i++;
    }

    if (setClauses.length > 0) {
      values.push(id);
      await client.query(
        `UPDATE transactions SET ${setClauses.join(", ")} WHERE id = $${i}`,
        values
      );
    }

    for (const edit of editsToInsert) {
      await client.query(
        `INSERT INTO transaction_edits (transaction_id, field, from_value, to_value)
         VALUES ($1, $2, $3, $4)`,
        [id, edit.field, String(edit.from ?? ""), String(edit.to ?? "")]
      );
    }

    const { rows: updatedRows } = await client.query(
      "SELECT * FROM transactions WHERE id = $1",
      [id]
    );

    // 2. Yangi yangilangan tranzaksiyaning hamyondagi ta'sirini qo'llaymiz (+1)
    await applyWalletBalanceChange(client, updatedRows[0], 1);

    await client.query("COMMIT");

    const { rows: edits } = await pool.query(
      "SELECT * FROM transaction_edits WHERE transaction_id = $1 ORDER BY edited_at ASC",
      [id]
    );

    return mapExpenseRow(updatedRows[0], edits);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteExpense(id) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: currentRows } = await client.query(
      "SELECT * FROM transactions WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (currentRows.length > 0) {
      // O'chirishdan oldin hamyon balansiga qaytaramiz (-1)
      await applyWalletBalanceChange(client, currentRows[0], -1);
      await client.query("DELETE FROM transactions WHERE id = $1", [id]);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
