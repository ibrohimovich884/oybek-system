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

router.post("/usd/log", async (req, res) => {
  try {
    const rate = Number(req.body.rate);
    if (!rate || isNaN(rate)) {
      return res.status(400).json({ error: "Noto'g'ri kurs qiymati" });
    }
    const saved = await dollarRateService.logRate(rate);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
