import { Router } from "express";
import * as debtsService from "../services/debtsService.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const debts = await debtsService.getAllDebts(userId);
    res.json(debts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const debt = await debtsService.createDebt(req.body, userId);
    res.status(201).json(debt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    const debt = await debtsService.getDebtById(req.params.id, userId);
    if (!debt) return res.status(404).json({ error: "Qarz topilmadi" });
    res.json(debt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    const debt = await debtsService.updateDebt(req.params.id, req.body, userId);
    res.json(debt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    await debtsService.deleteDebt(req.params.id, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/payments", async (req, res) => {
  try {
    const userId = req.user.userId;
    const payment = await debtsService.addDebtPayment(req.params.id, req.body, userId);
    const updatedDebt = await debtsService.getDebtById(req.params.id, userId);
    res.status(201).json({ updatedDebt, payment });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
