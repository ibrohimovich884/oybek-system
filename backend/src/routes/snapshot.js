import { Router } from "express";
import { pool } from "../../db/pool.js";

const router = Router();

// Control Panel ma'lumotlari: rezervlar, dollar kursi tarixi, qarzlar.
// Tranzaksiyalarga TEGMAYDI (bu /api/backup dan farqi).
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM app_snapshot WHERE id = 1");
    const s = rows[0] || {};
    res.json({
      reserves: s.reserves || {},
      dollarRateHistory: s.dollar_rate_history || [],
      pendingDebts: s.pending_debts || [],
      updatedAt: s.updated_at || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/", async (req, res) => {
  const { reserves, dollarRateHistory, pendingDebts } = req.body;
  try {
    await pool.query(
      `INSERT INTO app_snapshot (id, reserves, dollar_rate_history, pending_debts, updated_at)
       VALUES (
         1,
         COALESCE($1::jsonb, '{}'::jsonb),
         COALESCE($2::jsonb, '[]'::jsonb),
         COALESCE($3::jsonb, '[]'::jsonb),
         now()
       )
       ON CONFLICT (id) DO UPDATE SET
         reserves = CASE WHEN $1::jsonb IS NOT NULL THEN $1::jsonb ELSE app_snapshot.reserves END,
         dollar_rate_history = CASE WHEN $2::jsonb IS NOT NULL THEN $2::jsonb ELSE app_snapshot.dollar_rate_history END,
         pending_debts = CASE WHEN $3::jsonb IS NOT NULL THEN $3::jsonb ELSE app_snapshot.pending_debts END,
         updated_at = now()`,
      [
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
