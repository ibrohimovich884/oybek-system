import { Router } from "express";
import * as debtsService from "../services/debtsService.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const debts = await debtsService.getAllDebts();
    res.json(debts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const debt = await debtsService.createDebt(req.body);
    res.status(201).json(debt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const debt = await debtsService.getDebtById(req.params.id);
    if (!debt) return res.status(404).json({ error: "Qarz topilmadi" });
    res.json(debt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const debt = await debtsService.updateDebt(req.params.id, req.body);
    res.json(debt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await debtsService.deleteDebt(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/payments", async (req, res) => {
  try {
    const payment = await debtsService.addDebtPayment(req.params.id, req.body);
    const updatedDebt = await debtsService.getDebtById(req.params.id);
    res.status(201).json({ updatedDebt, payment });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
