import { Router } from "express";
import * as peopleService from "../services/peopleService.js";

const router = Router();

// GET /api/people — Barcha odamlar (filtrlar bilan)
router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const people = await peopleService.getAllPeople(userId, req.query);
    res.json(people);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/people/stats — Odamlar statistikasi
router.get("/stats", async (req, res) => {
  try {
    const userId = req.user.userId;
    const stats = await peopleService.getPeopleStats(userId);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/people/crushes — Faqat yoqtirganlar ro'yxati
router.get("/crushes", async (req, res) => {
  try {
    const userId = req.user.userId;
    const crushes = await peopleService.getAllPeople(userId, {
      ...req.query,
      isCrush: true,
    });
    res.json(crushes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/people/:id — Bitta odamning to'liq kartasi
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    const person = await peopleService.getPersonById(req.params.id, userId);
    if (!person) {
      return res.status(404).json({ error: "Shaxs kartasi topilmadi" });
    }
    res.json(person);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/people — Yangi odam qo'shish
router.post("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const created = await peopleService.createPerson(req.body, userId);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/people/:id — Asosiy kartani yangilash
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    const updated = await peopleService.updatePerson(req.params.id, req.body, userId);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/people/:id/crush — Crush statusini tezkor yangilash
router.patch("/:id/crush", async (req, res) => {
  try {
    const userId = req.user.userId;
    const updated = await peopleService.updateCrushStatus(req.params.id, req.body, userId);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/people/:id/profile — Kengaytirilgan profilni saqlash / yangilash
router.put("/:id/profile", async (req, res) => {
  try {
    const userId = req.user.userId;
    const profile = await peopleService.upsertProfile(req.params.id, req.body, userId);
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/people/:id/appearances — Yangi tashqi ko'rinish qaydi qo'shish
router.post("/:id/appearances", async (req, res) => {
  try {
    const userId = req.user.userId;
    const appearance = await peopleService.addAppearance(req.params.id, req.body, userId);
    res.status(201).json(appearance);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/people/:id/appearances/:appearanceId — Tashqi ko'rinish qaydini o'chirish
router.delete("/:id/appearances/:appearanceId", async (req, res) => {
  try {
    const userId = req.user.userId;
    await peopleService.deleteAppearance(req.params.appearanceId, req.params.id, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/people/:id — Shaxsni butunlay o'chirish (CASCADE)
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    await peopleService.deletePerson(req.params.id, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
