import { Router } from "express";
import * as walletsService from "../services/walletsService.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const wallets = await walletsService.getWallets();
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/", async (req, res) => {
  try {
    const wallets = await walletsService.updateWallets(req.body);
    res.json(wallets);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
