import { Router } from "express";
import * as walletsService from "../services/walletsService.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const withNotes = req.query.withNotes === "true";
    if (withNotes) {
      const wallets = await walletsService.getAllWalletsWithNotes(userId);
      return res.json(wallets);
    }
    const wallets = await walletsService.getWallets(userId);
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const wallets = await walletsService.updateWallets(req.body, userId);
    res.json(wallets);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id/notes", async (req, res) => {
  try {
    const userId = req.user.userId;
    const notes = await walletsService.getWalletNotes(req.params.id, userId);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/notes", async (req, res) => {
  try {
    const userId = req.user.userId;
    const note = await walletsService.addWalletNote(req.params.id, req.body, userId);
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
