import { Router } from "express";
import { pool } from "../../db/pool.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// =========================================================================
// GET /api/updates — Barcha tizim yangilanishlari roʻyxati
// =========================================================================
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
        id, 
        version, 
        title, 
        category, 
        badge, 
        summary, 
        details, 
        release_date, 
        is_pinned, 
        created_at, 
        updated_at
       FROM system_updates
       ORDER BY is_pinned DESC, release_date DESC, created_at DESC`
    );

    return res.json({
      ok: true,
      count: rows.length,
      updates: rows,
    });
  } catch (err) {
    console.error("[get updates error]", err);
    return res.status(500).json({ error: "Yangilanishlarni olishda xatolik: " + err.message });
  }
});

// =========================================================================
// GET /api/updates/:id — Bitta yangilanish tafsilotlari
// =========================================================================
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`SELECT * FROM system_updates WHERE id = $1`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Yangilanish topilmadi" });
    }
    return res.json({ ok: true, update: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: "Yangilanishni olishda xatolik: " + err.message });
  }
});

// =========================================================================
// POST /api/updates — Yangi tizim yangilanishini kiritish (Faqat Admin)
// =========================================================================
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { version, title, category, badge, summary, details, releaseDate, isPinned } = req.body;

    if (!version || !title || !summary) {
      return res.status(400).json({ error: "Versiya, sarlavha va qisqacha tavsif kiritilishi shart" });
    }

    const id = `upd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const parsedDetails = Array.isArray(details) ? JSON.stringify(details) : typeof details === "string" ? details : "[]";

    const insertRes = await pool.query(
      `INSERT INTO system_updates (
        id, version, title, category, badge, summary, details, release_date, is_pinned, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
      RETURNING *`,
      [
        id,
        version.trim(),
        title.trim(),
        category || "feature",
        badge ? badge.trim() : null,
        summary.trim(),
        parsedDetails,
        releaseDate || new Date().toISOString().split("T")[0],
        Boolean(isPinned),
      ]
    );

    return res.status(201).json({
      ok: true,
      message: "Yangi tizim yangilanishi muvaffaqiyatli saqlandi",
      update: insertRes.rows[0],
    });
  } catch (err) {
    console.error("[create update error]", err);
    return res.status(500).json({ error: "Yangilanish yaratishda xatolik: " + err.message });
  }
});

// =========================================================================
// PUT /api/updates/:id — Yangilanishni tahrirlash (Faqat Admin)
// =========================================================================
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { version, title, category, badge, summary, details, releaseDate, isPinned } = req.body;

    const parsedDetails = Array.isArray(details) ? JSON.stringify(details) : typeof details === "string" ? details : undefined;

    const updateRes = await pool.query(
      `UPDATE system_updates
       SET 
        version = COALESCE($1, version),
        title = COALESCE($2, title),
        category = COALESCE($3, category),
        badge = COALESCE($4, badge),
        summary = COALESCE($5, summary),
        details = CASE WHEN $6::text IS NOT NULL THEN $6::jsonb ELSE details END,
        release_date = COALESCE($7, release_date),
        is_pinned = COALESCE($8, is_pinned),
        updated_at = now()
       WHERE id = $9
       RETURNING *`,
      [
        version ? version.trim() : null,
        title ? title.trim() : null,
        category || null,
        badge !== undefined ? (badge ? badge.trim() : null) : null,
        summary ? summary.trim() : null,
        parsedDetails || null,
        releaseDate || null,
        isPinned !== undefined ? Boolean(isPinned) : null,
        id,
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: "Yangilanish topilmadi" });
    }

    return res.json({
      ok: true,
      message: "Yangilanish maʼlumotlari saqlandi",
      update: updateRes.rows[0],
    });
  } catch (err) {
    console.error("[edit update error]", err);
    return res.status(500).json({ error: "Yangilanishni tahrirlashda xatolik: " + err.message });
  }
});

// =========================================================================
// DELETE /api/updates/:id — Yangilanishni oʻchirish (Faqat Admin)
// =========================================================================
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const delRes = await pool.query(`DELETE FROM system_updates WHERE id = $1 RETURNING id`, [id]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: "Yangilanish topilmadi" });
    }
    return res.json({ ok: true, message: "Yangilanish oʻchirildi" });
  } catch (err) {
    return res.status(500).json({ error: "Oʻchirishda xatolik: " + err.message });
  }
});

// =========================================================================
// POST /api/updates/complaints — Yangilanish boʻyicha adminga shikoyat yoki taklif yuborish
// =========================================================================
router.post("/complaints", requireAuth, async (req, res) => {
  try {
    const {
      updateId,
      updateVersion,
      updateTitle,
      complaintType, // 'complaint' | 'bug' | 'suggestion' | 'question'
      priority,      // 'low' | 'normal' | 'high' | 'urgent'
      subject,
      message,
      contactName,
      contactEmail,
      contactPhone,
    } = req.body;

    const cleanSubject = String(subject || "").trim();
    const cleanMessage = String(message || "").trim();

    if (!cleanSubject || !cleanMessage) {
      return res.status(400).json({ error: "Mavzu va shikoyat matni kiritilishi shart" });
    }

    const userId = req.user?.userId || null;
    const userName = (contactName || req.user?.fullName || req.user?.username || "Foydalanuvchi").trim();
    const userEmail = (contactEmail || req.user?.email || "noma'lum").trim();
    const userPhone = contactPhone ? String(contactPhone).trim() : null;

    const id = `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const insertRes = await pool.query(
      `INSERT INTO update_complaints (
        id, user_id, user_name, user_email, user_phone,
        update_id, update_version, update_title,
        complaint_type, priority, subject, message,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', now(), now())
      RETURNING *`,
      [
        id,
        userId,
        userName,
        userEmail,
        userPhone,
        updateId || null,
        updateVersion || null,
        updateTitle || null,
        complaintType || "complaint",
        priority || "normal",
        cleanSubject,
        cleanMessage,
      ]
    );

    return res.status(201).json({
      ok: true,
      message: "Shikoyatingiz qabul qilindi va adminga yetkazildi. Rahmat!",
      complaint: insertRes.rows[0],
    });
  } catch (err) {
    console.error("[submit complaint error]", err);
    return res.status(500).json({ error: "Shikoyatni yuborishda xatolik: " + err.message });
  }
});

// =========================================================================
// GET /api/updates/my-complaints — Foydalanuvchining oʻzi yuborgan shikoyatlar
// =========================================================================
router.get("/my-complaints", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userEmail = req.user?.email;

    const { rows } = await pool.query(
      `SELECT * FROM update_complaints
       WHERE user_id = $1 OR user_email = $2
       ORDER BY created_at DESC`,
      [userId, userEmail]
    );

    return res.json({
      ok: true,
      count: rows.length,
      complaints: rows,
    });
  } catch (err) {
    return res.status(500).json({ error: "Murojaatlaringizni olishda xatolik: " + err.message });
  }
});

export default router;
