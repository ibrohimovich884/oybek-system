import { Router } from "express";
import * as exercisesService from "../services/exercisesService.js";

const router = Router();

router.get("/logs", async (req, res) => {
  try {
    const userId = req.user.userId;
    const logs = await exercisesService.getAllLogs(userId);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/logs", async (req, res) => {
  try {
    const userId = req.user.userId;
    const log = await exercisesService.logExercise(req.body, userId);
    res.json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const exercises = await exercisesService.getAllExercises(userId);
    res.json(exercises);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const exercise = await exercisesService.createExercise(req.body, userId);
    res.status(201).json(exercise);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    await exercisesService.deleteExercise(req.params.id, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
