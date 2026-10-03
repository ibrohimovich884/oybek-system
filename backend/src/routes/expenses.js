import { Router } from "express";
import * as expensesService from "../services/expensesService.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const expenses = await expensesService.getAllExpenses(userId);
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const created = await expensesService.createExpense(req.body, userId);
    res.status(201).json(created);
  } catch (err) {
    console.error("Expense create error:", err);
    res.status(400).json({ error: err.message, detail: err.detail, code: err.code });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    const updated = await expensesService.updateExpense(req.params.id, req.body, userId);
    res.json(updated);
  } catch (err) {
    console.error("Expense update error:", err);
    res.status(err.status || 400).json({ error: err.message, detail: err.detail, code: err.code });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    await expensesService.deleteExpense(req.params.id, userId);
    res.json({ success: true });
  } catch (err) {
    console.error("Expense delete error:", err);
    res.status(400).json({ error: err.message, detail: err.detail, code: err.code });
  }
});

export default router;
