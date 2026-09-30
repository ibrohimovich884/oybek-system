import { Router } from "express";
import * as dollarRateService from "../services/dollarRateService.js";

const router = Router();

router.get("/usd", async (req, res) => {
  try {
    const current = await dollarRateService.getCurrentRate();
    res.json(current);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/usd/sync-cbu", async (req, res) => {
  try {
    const saved = await dollarRateService.syncFromCbu();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
