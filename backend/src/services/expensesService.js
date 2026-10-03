import { pool } from "../../db/pool.js";
import { mapExpenseRow } from "../utils/mapExpense.js";
import { canonicalWalletId, cleanWalletKey, ensureUserWallets } from "./walletsService.js";

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

async function applyWalletBalanceChange(client, tx, multiplier = 1, userId) {
  const type = tx.type || "expense";
  const amount = Number(tx.amount || 0);
  if (!amount || isNaN(amount)) return;

  const rawWallet = cleanWalletKey(tx.wallet || tx.payment_method || tx.paymentMethod);
  const rawFromWallet = cleanWalletKey(tx.from_wallet || tx.fromWallet);
  const rawToWallet = cleanWalletKey(tx.to_wallet || tx.toWallet);

  const wallet = canonicalWalletId(rawWallet, userId);
  const fromWallet = canonicalWalletId(rawFromWallet, userId);
  const toWallet = canonicalWalletId(rawToWallet, userId);

  const delta = amount * Number(multiplier);

  if (type === "expense") {
    if (wallet) {
      await client.query(
        "UPDATE wallets SET balance = balance - $1::numeric WHERE id = $2 OR (user_id = $3 AND id LIKE $4)",
        [delta, wallet, userId || null, `%_${rawWallet}`]
      );
    }
  } else if (type === "income") {
    if (wallet) {
      await client.query(
        "UPDATE wallets SET balance = balance + $1::numeric WHERE id = $2 OR (user_id = $3 AND id LIKE $4)",
        [delta, wallet, userId || null, `%_${rawWallet}`]
      );
    }
  } else if (type === "transfer") {
    const targetAmount = Number(tx.target_amount ?? tx.targetAmount ?? amount);
    const targetDelta = targetAmount * Number(multiplier);

    if (fromWallet) {
      await client.query(
        "UPDATE wallets SET balance = balance - $1::numeric WHERE id = $2 OR (user_id = $3 AND id LIKE $4)",
        [delta, fromWallet, userId || null, `%_${rawFromWallet}`]
      );
    }
    if (toWallet) {
      await client.query(
        "UPDATE wallets SET balance = balance + $1::numeric WHERE id = $2 OR (user_id = $3 AND id LIKE $4)",
        [targetDelta, toWallet, userId || null, `%_${rawToWallet}`]
      );
    }
  }
}

export async function getAllExpenses(userId) {
  const txQuery = userId
    ? "SELECT * FROM transactions WHERE user_id = $1 ORDER BY spent_at DESC"
    : "SELECT * FROM transactions ORDER BY spent_at DESC";
  const txParams = userId ? [userId] : [];

  const editsQuery = userId
    ? `SELECT te.* FROM transaction_edits te 
       JOIN transactions t ON te.transaction_id = t.id 
       WHERE t.user_id = $1 
       ORDER BY te.edited_at ASC`
    : "SELECT * FROM transaction_edits ORDER BY edited_at ASC";
  const editsParams = userId ? [userId] : [];

  const [{ rows: transactions }, { rows: edits }] = await Promise.all([
    pool.query(txQuery, txParams),
    pool.query(editsQuery, editsParams),
  ]);

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

export async function createExpense(payload, userId) {
  if (userId) {
    await ensureUserWallets(userId);
  }

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

  const cleanWallet = cleanWalletKey(wallet || paymentMethod);
  const cleanFromWallet = fromWallet ? cleanWalletKey(fromWallet) : null;
  const cleanToWallet = toWallet ? cleanWalletKey(toWallet) : null;
  const cleanPaymentMethod = paymentMethod ? cleanWalletKey(paymentMethod) : cleanWallet;

  const resolvedWallet = cleanWallet;
  const resolvedFromWallet = cleanFromWallet;
  const resolvedToWallet = cleanToWallet;
  const resolvedPaymentMethod = cleanPaymentMethod;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO transactions
        (id, user_id, type, amount, currency, category, subcategory, reason, location, payment_method, wallet, from_wallet, to_wallet, quantity, exchange_rate_at_time, spent_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, COALESCE($17, now()))
       ON CONFLICT (id) DO NOTHING
       RETURNING *`,
      [
        id,
        userId || null,
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
      await applyWalletBalanceChange(client, rows[0], 1, userId);
      await client.query("COMMIT");

      if (type === "transfer") {
        const transferNote = reason?.trim() || `${resolvedFromWallet} dan ${resolvedToWallet} ga o'tkazma`;
        const isReserveWallet = (w) => w && (w.endsWith("_reserve") || w.endsWith("-asosiy"));

        if (isReserveWallet(resolvedToWallet)) {
          const dbToWallet = canonicalWalletId(resolvedToWallet, userId);
          pool.query(
            `INSERT INTO wallet_notes (wallet_id, user_id, text, amount_at_time, edited_at)
             VALUES ($1, $2, $3, (SELECT balance FROM wallets WHERE id = $1 LIMIT 1), now())`,
            [dbToWallet, userId || null, `O'tkazma: +${amount} (${transferNote})`]
          ).catch((e) => console.warn("To-reserve note error:", e.message));
        }

        if (isReserveWallet(resolvedFromWallet)) {
          const dbFromWallet = canonicalWalletId(resolvedFromWallet, userId);
          pool.query(
            `INSERT INTO wallet_notes (wallet_id, user_id, text, amount_at_time, edited_at)
             VALUES ($1, $2, $3, (SELECT balance FROM wallets WHERE id = $1 LIMIT 1), now())`,
            [dbFromWallet, userId || null, `O'tkazma: -${amount} (${transferNote})`]
          ).catch((e) => console.warn("From-reserve note error:", e.message));
        }
      }

      return mapExpenseRow(rows[0], []);
    }

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

export async function updateExpense(id, updates, userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const selectQuery = userId
      ? "SELECT * FROM transactions WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) FOR UPDATE"
      : "SELECT * FROM transactions WHERE id = $1 FOR UPDATE";
    const selectParams = userId ? [id, userId] : [id];

    const { rows: currentRows } = await client.query(selectQuery, selectParams);
    if (currentRows.length === 0) {
      await client.query("COMMIT");
      return await createExpense({ id, ...updates }, userId);
    }
    const current = currentRows[0];

    // Eski holatning ta'sirini bekor qilamiz (-1)
    await applyWalletBalanceChange(client, current, -1, userId);

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
        val = cleanWalletKey(val);
      }
      setClauses.push(`${column} = $${i}`);
      values.push(val);
      i++;
    }

    if (setClauses.length > 0) {
      values.push(id);
      let updateSql = `UPDATE transactions SET ${setClauses.join(", ")} WHERE id = $${i}`;
      if (userId) {
        i++;
        values.push(userId);
        updateSql += ` AND (user_id = $${i} OR user_id IS NULL)`;
      }
      await client.query(updateSql, values);
    }

    for (const edit of editsToInsert) {
      await client.query(
        `INSERT INTO transaction_edits (transaction_id, user_id, field, from_value, to_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, userId || null, edit.field, String(edit.from ?? ""), String(edit.to ?? "")]
      );
    }

    const { rows: updatedRows } = await client.query(
      "SELECT * FROM transactions WHERE id = $1",
      [id]
    );

    // Yangi holat ta'sirini qo'llaymiz (+1)
    await applyWalletBalanceChange(client, updatedRows[0], 1, userId);

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

export async function deleteExpense(id, userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const selectQuery = userId
      ? "SELECT * FROM transactions WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) FOR UPDATE"
      : "SELECT * FROM transactions WHERE id = $1 FOR UPDATE";
    const selectParams = userId ? [id, userId] : [id];

    const { rows: currentRows } = await client.query(selectQuery, selectParams);

    if (currentRows.length > 0) {
      await applyWalletBalanceChange(client, currentRows[0], -1, userId);
      if (userId) {
        await client.query("DELETE FROM transactions WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)", [id, userId]);
      } else {
        await client.query("DELETE FROM transactions WHERE id = $1", [id]);
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
