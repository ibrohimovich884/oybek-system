import { pool } from "../../db/pool.js";

const WALLET_IDS = ["hamyon", "naqd", "karta", "dollar"];

export async function getWallets() {
  const { rows } = await pool.query("SELECT id, balance FROM wallets");
  const wallets = { hamyon: 0, naqd: 0, karta: 0, dollar: 0 };
  for (const row of rows) {
    wallets[row.id] = Number(row.balance);
  }
  return wallets;
}

export async function updateWallets(updates) {
  for (const id of WALLET_IDS) {
    if (updates[id] !== undefined) {
      await pool.query("UPDATE wallets SET balance = $1 WHERE id = $2", [
        updates[id],
        id,
      ]);
    }
  }
  return getWallets();
}
