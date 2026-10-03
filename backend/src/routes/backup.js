import { Router } from "express";
import { pool } from "../../db/pool.js";
import * as expensesService from "../services/expensesService.js";
import * as walletsService from "../services/walletsService.js";

const router = Router();

// Backup import
router.post("/", async (req, res) => {
  const userId = req.user.userId;
  const { wallets, expenses, reserves, dollarRateHistory, pendingDebts, confirmWipe } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (wallets) {
      for (const rawId of walletsService.WALLET_IDS) {
        if (wallets[rawId] !== undefined) {
          const dbWalletId = walletsService.canonicalWalletId(rawId, userId);
          await client.query(
            "UPDATE wallets SET balance = $1 WHERE id = $2 OR (user_id = $3 AND id LIKE $4)",
            [Number(wallets[rawId]), dbWalletId, userId || null, `%_${rawId}`]
          );
        }
      }
    }

    if (Array.isArray(expenses)) {
      if (expenses.length === 0 && !confirmWipe) {
        const { rows } = await client.query(
          "SELECT COUNT(*)::int AS n FROM transactions WHERE user_id = $1 OR user_id IS NULL",
          [userId || null]
        );
        if (rows[0].n > 0) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            error: "Serverda tranzaksiyalar bor, lekin yuborilgan ro'yxat bo'sh. Tasdiqlash uchun confirmWipe: true yuboring.",
          });
        }
      }

      if (userId) {
        await client.query("DELETE FROM transactions WHERE user_id = $1", [userId]);
      } else {
        await client.query("DELETE FROM transactions");
      }

      for (const item of expenses) {
        const cleanWallet = walletsService.cleanWalletKey(item.wallet || item.paymentMethod);
        const cleanFrom = item.fromWallet ? walletsService.cleanWalletKey(item.fromWallet) : null;
        const cleanTo = item.toWallet ? walletsService.cleanWalletKey(item.toWallet) : null;
        const cleanPaymentMethod = item.paymentMethod ? walletsService.cleanWalletKey(item.paymentMethod) : cleanWallet;

        await client.query(
          `INSERT INTO transactions
            (id, user_id, type, amount, currency, category, subcategory, reason, location, payment_method, wallet, from_wallet, to_wallet, quantity, exchange_rate_at_time, spent_at, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, COALESCE($17, now()))
           ON CONFLICT (id) DO NOTHING`,
          [
            item.id,
            userId || null,
            item.type || "expense",
            item.amount,
            item.currency || "UZS",
            item.category,
            item.subcategory,
            item.reason,
            item.location,
            cleanPaymentMethod,
            cleanWallet,
            cleanFrom,
            cleanTo,
            item.quantity || 1,
            item.exchangeRateAtTime || null,
            item.spentAt,
            item.createdAt,
          ]
        );

        if (Array.isArray(item.edits)) {
          for (const edit of item.edits) {
            await client.query(
              `INSERT INTO transaction_edits (transaction_id, user_id, field, from_value, to_value, edited_at)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [item.id, userId || null, edit.field, edit.from, edit.to, edit.editedAt]
            );
          }
        }
      }
    }

    if (reserves !== undefined || dollarRateHistory !== undefined || pendingDebts !== undefined) {
      const snapshotId = userId ? `snap_${userId}` : "1";
      const sets = [];
      const values = [];
      let i = 1;
      if (reserves !== undefined) {
        sets.push(`reserves = $${i++}`);
        values.push(JSON.stringify(reserves));
      }
      if (dollarRateHistory !== undefined) {
        sets.push(`dollar_rate_history = $${i++}`);
        values.push(JSON.stringify(dollarRateHistory));
      }
      if (pendingDebts !== undefined) {
        sets.push(`pending_debts = $${i++}`);
        values.push(JSON.stringify(pendingDebts));
      }
      sets.push(`updated_at = now()`);
      values.push(snapshotId);

      await client.query(
        `UPDATE app_snapshot SET ${sets.join(", ")} WHERE id = $${i}`,
        values
      );
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Backup export
router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const snapshotId = userId ? `snap_${userId}` : "1";

    const [expenses, wallets, snapshotResult] = await Promise.all([
      expensesService.getAllExpenses(userId),
      walletsService.getWallets(userId),
      pool.query("SELECT * FROM app_snapshot WHERE id = $1 OR (user_id = $2 AND user_id IS NOT NULL)", [
        snapshotId,
        userId || null,
      ]),
    ]);
    const snapshot = snapshotResult.rows[0] || {};

    res.json({
      version: "3.0.0",
      exportedAt: new Date().toISOString(),
      wallets,
      reserves: snapshot.reserves || {},
      dollarRateHistory: snapshot.dollar_rate_history || [],
      pendingDebts: snapshot.pending_debts || [],
      expenses,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
