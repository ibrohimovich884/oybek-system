import { Router } from "express";
import { pool } from "../../db/pool.js";
import * as expensesService from "../services/expensesService.js";
import * as walletsService from "../services/walletsService.js";

const router = Router();

// Frontenddagi "backup import" / "forcePushAllToDB" shu yerga POST qiladi.
router.post("/", async (req, res) => {
  const { wallets, expenses, reserves, dollarRateHistory, pendingDebts, confirmWipe } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (wallets) {
      for (const rawId of walletsService.WALLET_IDS) {
        if (wallets[rawId] !== undefined) {
          await client.query("UPDATE wallets SET balance = $1 WHERE id = $2", [
            Number(wallets[rawId]),
            rawId,
          ]);
        }
      }
      // Eski nomlar bo'lsa
      if (wallets["naqd-asosiy"] !== undefined) {
        await client.query("UPDATE wallets SET balance = $1 WHERE id = 'naqd_reserve'", [
          Number(wallets["naqd-asosiy"]),
        ]);
      }
      if (wallets["karta-asosiy"] !== undefined) {
        await client.query("UPDATE wallets SET balance = $1 WHERE id = 'karta_reserve'", [
          Number(wallets["karta-asosiy"]),
        ]);
      }
      if (wallets["dollar-asosiy"] !== undefined) {
        await client.query("UPDATE wallets SET balance = $1 WHERE id = 'dollar_reserve'", [
          Number(wallets["dollar-asosiy"]),
        ]);
      }
    }

    if (reserves && typeof reserves === "object") {
      if (reserves["naqd_reserve"]?.amount !== undefined || reserves["naqd-asosiy"]?.amount !== undefined) {
        const amt = Number(reserves["naqd_reserve"]?.amount ?? reserves["naqd-asosiy"]?.amount ?? 0);
        await client.query("UPDATE wallets SET balance = $1 WHERE id = 'naqd_reserve'", [amt]);
      }
      if (reserves["karta_reserve"]?.amount !== undefined || reserves["karta-asosiy"]?.amount !== undefined) {
        const amt = Number(reserves["karta_reserve"]?.amount ?? reserves["karta-asosiy"]?.amount ?? 0);
        await client.query("UPDATE wallets SET balance = $1 WHERE id = 'karta_reserve'", [amt]);
      }
      if (reserves["dollar_reserve"]?.amount !== undefined || reserves["dollar-asosiy"]?.amount !== undefined) {
        const amt = Number(reserves["dollar_reserve"]?.amount ?? reserves["dollar-asosiy"]?.amount ?? 0);
        await client.query("UPDATE wallets SET balance = $1 WHERE id = 'dollar_reserve'", [amt]);
      }
    }

    if (Array.isArray(expenses)) {
      if (expenses.length === 0 && !confirmWipe) {
        const { rows } = await client.query("SELECT COUNT(*)::int AS n FROM transactions");
        if (rows[0].n > 0) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            error: "Serverda tranzaksiyalar bor, lekin yuborilgan ro'yxat bo'sh. Tasdiqlash uchun confirmWipe: true yuboring.",
          });
        }
      }
      await client.query("DELETE FROM transaction_edits");
      await client.query("DELETE FROM transactions");

      for (const item of expenses) {
        const resolvedWallet = walletsService.canonicalWalletId(item.wallet || item.paymentMethod);
        const resolvedFrom = item.fromWallet ? walletsService.canonicalWalletId(item.fromWallet) : null;
        const resolvedTo = item.toWallet ? walletsService.canonicalWalletId(item.toWallet) : null;
        const resolvedPaymentMethod = item.paymentMethod ? walletsService.canonicalWalletId(item.paymentMethod) : resolvedWallet;

        await client.query(
          `INSERT INTO transactions
            (id, type, amount, currency, category, subcategory, reason, location, payment_method, wallet, from_wallet, to_wallet, quantity, exchange_rate_at_time, spent_at, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, COALESCE($16, now()))
           ON CONFLICT (id) DO NOTHING`,
          [
            item.id,
            item.type || "expense",
            item.amount,
            item.currency || "UZS",
            item.category,
            item.subcategory,
            item.reason,
            item.location,
            resolvedPaymentMethod,
            resolvedWallet,
            resolvedFrom,
            resolvedTo,
            item.quantity || 1,
            item.exchangeRateAtTime || null,
            item.spentAt,
            item.createdAt,
          ]
        );

        if (Array.isArray(item.edits)) {
          for (const edit of item.edits) {
            await client.query(
              `INSERT INTO transaction_edits (transaction_id, field, from_value, to_value, edited_at)
               VALUES ($1, $2, $3, $4, $5)`,
              [item.id, edit.field, edit.from, edit.to, edit.editedAt]
            );
          }
        }
      }
    }

    if (reserves !== undefined || dollarRateHistory !== undefined || pendingDebts !== undefined) {
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
      await client.query(
        `UPDATE app_snapshot SET ${sets.join(", ")} WHERE id = 1`,
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

// Joriy holatni frontend kutgan aynan shu JSON shaklida qaytaradi.
router.get("/", async (req, res) => {
  try {
    const [expenses, wallets, snapshotResult] = await Promise.all([
      expensesService.getAllExpenses(),
      walletsService.getWallets(),
      pool.query("SELECT * FROM app_snapshot WHERE id = 1"),
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
