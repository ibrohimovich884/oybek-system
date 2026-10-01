import { Router } from "express";
import * as walletsService from "../services/walletsService.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const withNotes = req.query.withNotes === "true";
    if (withNotes) {
      const wallets = await walletsService.getAllWalletsWithNotes();
      return res.json(wallets);
    }
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

router.get("/:id/notes", async (req, res) => {
  try {
    const notes = await walletsService.getWalletNotes(req.params.id);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/notes", async (req, res) => {
  try {
    const note = await walletsService.addWalletNote(req.params.id, req.body);
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
