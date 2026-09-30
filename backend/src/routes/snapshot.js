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
      `UPDATE app_snapshot SET
         reserves = COALESCE($1::jsonb, reserves),
         dollar_rate_history = COALESCE($2::jsonb, dollar_rate_history),
         pending_debts = COALESCE($3::jsonb, pending_debts),
         updated_at = now()
       WHERE id = 1`,
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
