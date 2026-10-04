import { pool } from "../../db/pool.js";

export const WALLET_KEYS = [
  "hamyon",
  "naqd",
  "karta",
  "dollar",
  "naqd_reserve",
  "karta_reserve",
  "dollar_reserve",
];

export const WALLET_IDS = WALLET_KEYS;

const LEGACY_MAP = {
  "naqd-asosiy": "naqd_reserve",
  "karta-asosiy": "karta_reserve",
  "dollar-asosiy": "dollar_reserve",
};

export function cleanWalletKey(id) {
  if (!id) return id;
  const legacyClean = LEGACY_MAP[id] || id;
  // Agar id 'usr_xyz_naqd' ko'rinishida bo'lsa
  for (const key of WALLET_KEYS) {
    if (legacyClean === key || legacyClean.endsWith(`_${key}`)) {
      return key;
    }
  }
  return legacyClean;
}

export function canonicalWalletId(id, userId) {
  if (!id) return id;
  const clean = cleanWalletKey(id);
  if (userId && WALLET_KEYS.includes(clean)) {
    return `${userId}_${clean}`;
  }
  return clean;
}

export async function ensureUserWallets(userId, client = pool) {
  if (!userId) return;

  const standardWallets = [
    { key: "hamyon", name: "Hamyon", currency: "UZS", balance: 0, parentKey: null },
    { key: "naqd", name: "Naqd pul", currency: "UZS", balance: 0, parentKey: null },
    { key: "karta", name: "Plastik karta", currency: "UZS", balance: 0, parentKey: null },
    { key: "dollar", name: "AQSH Dollari", currency: "USD", balance: 0, parentKey: null },
    { key: "naqd_reserve", name: "Naqd zaxira", currency: "UZS", balance: 0, parentKey: "naqd" },
    { key: "karta_reserve", name: "Karta zaxira", currency: "UZS", balance: 0, parentKey: "karta" },
    { key: "dollar_reserve", name: "Dollar zaxira", currency: "USD", balance: 0, parentKey: "dollar" },
  ];

  for (const w of standardWallets) {
    const rawWalletId = `${userId}_${w.key}`;
    const cleanWalletId = w.key;
    const parentIdClean = w.parentKey;
    const parentIdPrefixed = w.parentKey ? `${userId}_${w.parentKey}` : null;

    // Tekshiramiz: user uchun ushbu hamyon bormi?
    const { rows: existing } = await client.query(
      `SELECT id FROM wallets 
       WHERE (user_id = $1 AND (id = $2 OR id = $3 OR id LIKE $4))
          OR (user_id IS NULL AND id = $2)
       LIMIT 1`,
      [userId, cleanWalletId, rawWalletId, `%_${cleanWalletId}`]
    ).catch(() => ({ rows: [] }));

    if (existing.length === 0) {
      // 1-urinish: clean id bilan (agar PRIMARY KEY (user_id, id) bo'lsa)
      try {
        await client.query(
          `INSERT INTO wallets (id, user_id, name, currency, balance, parent_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [cleanWalletId, userId, w.name, w.currency, w.balance, parentIdClean]
        );
      } catch (err1) {
        // 2-urinish: prefixed id bilan (agar PRIMARY KEY (id) bo'lsa)
        try {
          await client.query(
            `INSERT INTO wallets (id, user_id, name, currency, balance, parent_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [rawWalletId, userId, w.name, w.currency, w.balance, parentIdPrefixed]
          );
        } catch (err2) {
          console.warn(`[ensureUserWallets] Hamyon yaratishda ogohlantirish (${w.key}):`, err2.message);
        }
      }
    }
  }
}

export async function getWallets(userId) {
  if (userId) {
    await ensureUserWallets(userId).catch(() => {});
  }

  const query = userId
    ? `SELECT id, name, currency, balance, parent_id FROM wallets 
       WHERE user_id = $1 OR id LIKE $2 OR (user_id IS NULL AND id IN ('hamyon','naqd','karta','dollar','naqd_reserve','karta_reserve','dollar_reserve'))
       ORDER BY id`
    : "SELECT id, name, currency, balance, parent_id FROM wallets ORDER BY id";
  const params = userId ? [userId, `${userId}_%`] : [];

  const { rows } = await pool.query(query, params);

  const wallets = {
    hamyon: 0,
    naqd: 0,
    karta: 0,
    dollar: 0,
    naqd_reserve: 0,
    karta_reserve: 0,
    dollar_reserve: 0,
    "naqd-asosiy": 0,
    "karta-asosiy": 0,
    "dollar-asosiy": 0,
  };

  const list = [];

  for (const row of rows) {
    const cleanKey = cleanWalletKey(row.id);
    const num = Number(row.balance || 0);

    wallets[cleanKey] = num;
    if (cleanKey === "naqd_reserve") wallets["naqd-asosiy"] = num;
    if (cleanKey === "karta_reserve") wallets["karta-asosiy"] = num;
    if (cleanKey === "dollar_reserve") wallets["dollar-asosiy"] = num;

    list.push({
      id: cleanKey,
      rawId: row.id,
      name: row.name,
      currency: row.currency,
      balance: num,
      parentId: cleanWalletKey(row.parent_id),
    });
  }

  return { ...wallets, _list: list };
}

export async function getAllWalletsWithNotes(userId) {
  if (userId) {
    await ensureUserWallets(userId).catch(() => {});
  }

  const walletQuery = userId
    ? `SELECT id, name, currency, balance, parent_id FROM wallets 
       WHERE user_id = $1 OR id LIKE $2 OR (user_id IS NULL AND id IN ('hamyon','naqd','karta','dollar','naqd_reserve','karta_reserve','dollar_reserve'))
       ORDER BY id`
    : "SELECT id, name, currency, balance, parent_id FROM wallets ORDER BY id";
  const walletParams = userId ? [userId, `${userId}_%`] : [];

  const noteQuery = userId
    ? `SELECT id, wallet_id, text, amount_at_time, edited_at FROM wallet_notes 
       WHERE user_id = $1 OR wallet_id LIKE $2 
       ORDER BY edited_at DESC`
    : "SELECT id, wallet_id, text, amount_at_time, edited_at FROM wallet_notes ORDER BY edited_at DESC";
  const noteParams = userId ? [userId, `${userId}_%`] : [];

  const [{ rows: walletRows }, { rows: noteRows }] = await Promise.all([
    pool.query(walletQuery, walletParams),
    pool.query(noteQuery, noteParams),
  ]);

  const notesByWallet = new Map();
  for (const n of noteRows) {
    const key = cleanWalletKey(n.wallet_id);
    if (!notesByWallet.has(key)) {
      notesByWallet.set(key, []);
    }
    notesByWallet.get(key).push({
      id: n.id,
      walletId: key,
      text: n.text,
      amountAtTime: n.amount_at_time ? Number(n.amount_at_time) : null,
      editedAt: n.edited_at,
      createdAt: n.edited_at,
    });
  }

  return walletRows.map((w) => {
    const cleanKey = cleanWalletKey(w.id);
    return {
      id: cleanKey,
      name: w.name,
      currency: w.currency,
      balance: Number(w.balance || 0),
      parentId: cleanWalletKey(w.parent_id),
      notes: notesByWallet.get(cleanKey) || [],
    };
  });
}

export async function updateWallets(updates, userId) {
  if (userId) {
    await ensureUserWallets(userId).catch(() => {});
  }

  for (const [rawKey, value] of Object.entries(updates)) {
    if (rawKey.startsWith("_")) continue;
    const cleanKey = cleanWalletKey(rawKey);
    if (WALLET_KEYS.includes(cleanKey) && value !== undefined && value !== null) {
      const dbWalletId = canonicalWalletId(cleanKey, userId);
      await pool.query(
        `UPDATE wallets SET balance = $1 
         WHERE (user_id = $2 AND (id = $3 OR id = $4 OR id LIKE $5))
            OR (id = $4 AND user_id IS NULL)`,
        [Number(value), userId, cleanKey, dbWalletId, `%_${cleanKey}`]
      );
    }
  }
  return getWallets(userId);
}

export async function addWalletNote(walletId, { text, amountAtTime, amount_at_time, editedAt, edited_at }, userId) {
  const cleanKey = cleanWalletKey(walletId);
  const amt =
    amountAtTime !== undefined && amountAtTime !== null && !isNaN(Number(amountAtTime))
      ? Number(amountAtTime)
      : (amount_at_time !== undefined && amount_at_time !== null && !isNaN(Number(amount_at_time))
        ? Number(amount_at_time)
        : null);

  const noteText = (text || "").trim() || "Izoh";
  const parsedDate = editedAt || edited_at ? new Date(editedAt || edited_at) : new Date();
  const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const { rows } = await pool.query(
    `INSERT INTO wallet_notes (wallet_id, user_id, text, amount_at_time, edited_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [cleanKey, userId || null, noteText, amt, validDate.toISOString()]
  );
  const row = rows[0];
  return {
    id: row.id,
    walletId: cleanKey,
    text: row.text,
    amountAtTime: row.amount_at_time !== null ? Number(row.amount_at_time) : null,
    editedAt: row.edited_at,
    createdAt: row.edited_at,
  };
}

export async function getWalletNotes(walletId, userId) {
  const cleanKey = cleanWalletKey(walletId);
  const dbWalletId = canonicalWalletId(cleanKey, userId);

  const { rows } = await pool.query(
    `SELECT id, wallet_id, text, amount_at_time, edited_at 
     FROM wallet_notes 
     WHERE (wallet_id = $1 OR wallet_id = $2 OR (user_id = $3 AND wallet_id LIKE $4))
     ORDER BY edited_at DESC`,
    [cleanKey, dbWalletId, userId || null, `%_${cleanKey}`]
  );

  return rows.map((r) => ({
    id: r.id,
    walletId: cleanKey,
    text: r.text,
    amountAtTime: r.amount_at_time ? Number(r.amount_at_time) : null,
    editedAt: r.edited_at,
    createdAt: r.edited_at,
  }));
}
