import { Router } from "express";
import { pool } from "../../db/pool.js";
import * as expensesService from "../services/expensesService.js";
import * as walletsService from "../services/walletsService.js";

const router = Router();

// Frontenddagi "backup import" / "forcePushAllToDB" shu yerga POST qiladi.
// reserves / dollarRateHistory / pendingDebts — frontend o'zi boshqaradigan
// JSON shakli, backend ularni o'zgartirmasdan aynan shu holicha saqlaydi.
router.post("/", async (req, res) => {
  const { wallets, expenses, reserves, dollarRateHistory, pendingDebts, confirmWipe } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (wallets) {
      for (const id of ["hamyon", "naqd", "karta", "dollar"]) {
        if (wallets[id] !== undefined) {
          await client.query("UPDATE wallets SET balance = $1 WHERE id = $2", [
            wallets[id],
            id,
          ]);
        }
      }
    }

    if (Array.isArray(expenses)) {
      // Bo'sh qurilmadan (yangi brauzer) kelgan bo'sh ro'yxat serverdagi
      // barcha tranzaksiyalarni o'chirib yuborishining oldini olamiz.
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
            item.paymentMethod,
            item.wallet,
            item.fromWallet,
            item.toWallet,
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
