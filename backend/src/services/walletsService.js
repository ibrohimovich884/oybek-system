import { pool } from "../../db/pool.js";

export const WALLET_IDS = [
  "hamyon",
  "naqd",
  "karta",
  "dollar",
  "naqd_reserve",
  "karta_reserve",
  "dollar_reserve",
];

const LEGACY_MAP = {
  "naqd-asosiy": "naqd_reserve",
  "karta-asosiy": "karta_reserve",
  "dollar-asosiy": "dollar_reserve",
};

export function canonicalWalletId(id) {
  if (!id) return id;
  return LEGACY_MAP[id] || id;
}

export async function getWallets() {
  const { rows } = await pool.query(
    "SELECT id, name, currency, balance, parent_id FROM wallets ORDER BY id"
  );
  
  const wallets = {
    hamyon: 0,
    naqd: 0,
    karta: 0,
    dollar: 0,
    naqd_reserve: 0,
    karta_reserve: 0,
    dollar_reserve: 0,
    // Orqaga moslik uchun eski kalitlar
    "naqd-asosiy": 0,
    "karta-asosiy": 0,
    "dollar-asosiy": 0,
  };

  const list = [];

  for (const row of rows) {
    const num = Number(row.balance);
    wallets[row.id] = num;
    if (row.id === "naqd_reserve") wallets["naqd-asosiy"] = num;
    if (row.id === "karta_reserve") wallets["karta-asosiy"] = num;
    if (row.id === "dollar_reserve") wallets["dollar-asosiy"] = num;

    list.push({
      id: row.id,
      name: row.name,
      currency: row.currency,
      balance: num,
      parentId: row.parent_id,
    });
  }

  return { ...wallets, _list: list };
}

export async function getAllWalletsWithNotes() {
  const { rows: walletRows } = await pool.query(
    "SELECT id, name, currency, balance, parent_id FROM wallets ORDER BY id"
  );
  const { rows: noteRows } = await pool.query(
    "SELECT id, wallet_id, text, amount_at_time, edited_at FROM wallet_notes ORDER BY edited_at DESC"
  );

  const notesByWallet = new Map();
  for (const n of noteRows) {
    if (!notesByWallet.has(n.wallet_id)) {
      notesByWallet.set(n.wallet_id, []);
    }
    notesByWallet.get(n.wallet_id).push({
      id: n.id,
      walletId: n.wallet_id,
      text: n.text,
      amountAtTime: n.amount_at_time ? Number(n.amount_at_time) : null,
      editedAt: n.edited_at,
      createdAt: n.edited_at,
    });
  }

  return walletRows.map((w) => ({
    id: w.id,
    name: w.name,
    currency: w.currency,
    balance: Number(w.balance),
    parentId: w.parent_id,
    notes: notesByWallet.get(w.id) || [],
  }));
}

export async function updateWallets(updates) {
  for (const [rawKey, value] of Object.entries(updates)) {
    if (rawKey.startsWith("_")) continue;
    const key = canonicalWalletId(rawKey);
    if (WALLET_IDS.includes(key) && value !== undefined && value !== null) {
      await pool.query(
        "UPDATE wallets SET balance = $1 WHERE id = $2",
        [Number(value), key]
      );
    }
  }
  return getWallets();
}

export async function addWalletNote(walletId, { text, amountAtTime, amount_at_time, editedAt, edited_at }) {
  const id = canonicalWalletId(walletId);
  const amt =
    amountAtTime !== undefined && amountAtTime !== null && !isNaN(Number(amountAtTime))
      ? Number(amountAtTime)
      : (amount_at_time !== undefined && amount_at_time !== null && !isNaN(Number(amount_at_time))
        ? Number(amount_at_time)
        : null);

  const noteText = (text || "").trim() || "Izoh";
  const parsedDate = editedAt || edited_at ? new Date(editedAt || edited_at) : new Date();
  const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  try {
    const { rows } = await pool.query(
      `INSERT INTO wallet_notes (wallet_id, text, amount_at_time, edited_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (wallet_id, edited_at) DO UPDATE
         SET text = EXCLUDED.text,
             amount_at_time = EXCLUDED.amount_at_time
       RETURNING *`,
      [id, noteText, amt, validDate.toISOString()]
    );
    const row = rows[0];
    return {
      id: row.id,
      walletId: row.wallet_id,
      text: row.text,
      amountAtTime: row.amount_at_time !== null ? Number(row.amount_at_time) : null,
      editedAt: row.edited_at,
      createdAt: row.edited_at,
    };
  } catch (err) {
    // Agar UNIQUE constraint mos kelmasa, vaqt bo'yicha to'g'ridan-to'g'ri yangi qator kiritadi
    const { rows } = await pool.query(
      `INSERT INTO wallet_notes (wallet_id, text, amount_at_time, edited_at)
       VALUES ($1, $2, $3, now())
       RETURNING *`,
      [id, noteText, amt]
    );
    const row = rows[0];
    return {
      id: row.id,
      walletId: row.wallet_id,
      text: row.text,
      amountAtTime: row.amount_at_time !== null ? Number(row.amount_at_time) : null,
      editedAt: row.edited_at,
      createdAt: row.edited_at,
    };
  }
}

export async function getWalletNotes(walletId) {
  const id = canonicalWalletId(walletId);
  const { rows } = await pool.query(
    "SELECT id, wallet_id, text, amount_at_time, edited_at FROM wallet_notes WHERE wallet_id = $1 ORDER BY edited_at DESC",
    [id]
  );
  return rows.map((r) => ({
    id: r.id,
    walletId: r.wallet_id,
    text: r.text,
    amountAtTime: r.amount_at_time ? Number(r.amount_at_time) : null,
    editedAt: r.edited_at,
    createdAt: r.edited_at,
  }));
}
