import { Router } from "express";
import * as exercisesService from "../services/exercisesService.js";

const router = Router();

router.get("/logs", async (req, res) => {
  try {
    const logs = await exercisesService.getAllLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/logs", async (req, res) => {
  try {
    const log = await exercisesService.logExercise(req.body);
    res.json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const exercises = await exercisesService.getAllExercises();
    res.json(exercises);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const exercise = await exercisesService.createExercise(req.body);
    res.status(201).json(exercise);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await exercisesService.deleteExercise(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
