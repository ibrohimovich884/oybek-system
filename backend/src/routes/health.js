import { Router } from "express";
import { pool } from "../../db/pool.js";
import { checkSchema } from "../../db/ensureSchema.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    const schema = await checkSchema().catch((e) => ({ ok: false, problems: [{ kind: "error", message: e.message }] }));
    res.json({ status: "ok", db: "connected", schema });
  } catch (err) {
    res.status(500).json({ status: "error", db: "disconnected", error: err.message });
  }
});

export default router;
