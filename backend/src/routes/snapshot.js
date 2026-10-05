import { Router } from "express";
import { pool } from "../../db/pool.js";
import { canonicalWalletId } from "../services/walletsService.js";
import * as debtsService from "../services/debtsService.js";

const router = Router();

// Control Panel ma'lumotlari: rezervlar, dollar kursi tarixi, qarzlar.
router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const snapshotId = userId ? `snap_${userId}` : "1";

    const [{ rows }, realDebts] = await Promise.all([
      pool.query(
        "SELECT * FROM app_snapshot WHERE id::text = $1 OR (user_id = $2 AND user_id IS NOT NULL)",
        [snapshotId, userId || null]
      ),
      debtsService.getAllDebts(userId).catch(() => []),
    ]);
    const s = rows[0] || {};

    // Wallets jadvalidagi haqiqiy zaxira balanslarini olamiz
    const { rows: walletRows } = await pool.query(
      `SELECT id, balance FROM wallets 
       WHERE (id IN ('naqd_reserve', 'karta_reserve', 'dollar_reserve') AND user_id IS NULL)
          OR (user_id = $1 AND (id LIKE '%_naqd_reserve' OR id LIKE '%_karta_reserve' OR id LIKE '%_dollar_reserve'))`,
      [userId || null]
    );
    const walletBalanceMap = new Map();
    walletRows.forEach((r) => {
      if (r.id.endsWith("naqd_reserve")) walletBalanceMap.set("naqd_reserve", Number(r.balance));
      if (r.id.endsWith("karta_reserve")) walletBalanceMap.set("karta_reserve", Number(r.balance));
      if (r.id.endsWith("dollar_reserve")) walletBalanceMap.set("dollar_reserve", Number(r.balance));
    });

    const rawReserves = s.reserves || {};
    const reserves = { ...rawReserves };

    for (const [id, bal] of walletBalanceMap.entries()) {
      const legacyId = id.replace("_reserve", "-asosiy");
      const currentObj = reserves[id] || reserves[legacyId] || { id, notes: [] };
      const updatedObj = {
        ...currentObj,
        id,
        amount: bal,
        notes: Array.isArray(currentObj.notes) ? currentObj.notes : [],
      };
      reserves[id] = updatedObj;
      reserves[legacyId] = updatedObj;
    }

    res.json({
      reserves,
      dollarRateHistory: s.dollar_rate_history || [],
      pendingDebts: Array.isArray(realDebts) && realDebts.length > 0 ? realDebts : (s.pending_debts || []),
      updatedAt: s.updated_at || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/", async (req, res) => {
  const userId = req.user.userId;
  const snapshotId = userId ? `snap_${userId}` : "1";
  const { reserves, dollarRateHistory, pendingDebts } = req.body;

  try {
    await pool.query(
      `INSERT INTO app_snapshot (id, user_id, reserves, dollar_rate_history, pending_debts, updated_at)
       VALUES (
         $1,
         $2,
         COALESCE($3::jsonb, '{}'::jsonb),
         COALESCE($4::jsonb, '[]'::jsonb),
         COALESCE($5::jsonb, '[]'::jsonb),
         now()
       )
       ON CONFLICT (id) DO UPDATE SET
         reserves = CASE WHEN $3::jsonb IS NOT NULL THEN $3::jsonb ELSE app_snapshot.reserves END,
         dollar_rate_history = CASE WHEN $4::jsonb IS NOT NULL THEN $4::jsonb ELSE app_snapshot.dollar_rate_history END,
         pending_debts = CASE WHEN $5::jsonb IS NOT NULL THEN $5::jsonb ELSE app_snapshot.pending_debts END,
         updated_at = now()`,
      [
        snapshotId,
        userId || null,
        reserves !== undefined ? JSON.stringify(reserves) : null,
        dollarRateHistory !== undefined ? JSON.stringify(dollarRateHistory) : null,
        pendingDebts !== undefined ? JSON.stringify(pendingDebts) : null,
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
