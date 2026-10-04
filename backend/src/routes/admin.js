import { Router } from "express";
import { pool } from "../../db/pool.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { hashPassword, verifyPassword } from "../utils/security.js";
import { ensureUserWallets } from "../services/walletsService.js";

const router = Router();

// Barcha admin marshrutlari requireAuth va requireAdmin bilan himoyalangan
router.use(requireAuth, requireAdmin);

// =========================================================================
// GET /api/admin/stats — Tizim umumiy statistikasi
// =========================================================================
router.get("/stats", async (req, res) => {
  try {
    const [
      usersCountRes,
      activeUsersRes,
      txCountRes,
      walletsCountRes,
      debtsCountRes,
      complaintsCountRes,
      pendingComplaintsRes,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM users`),
      pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE is_active = true`),
      pool.query(`SELECT COUNT(*)::int AS count FROM transactions`),
      pool.query(`SELECT COUNT(*)::int AS count FROM wallets`),
      pool.query(`SELECT COUNT(*)::int AS count FROM debts WHERE status != 'settled'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM update_complaints`).catch(() => ({ rows: [{ count: 0 }] })),
      pool.query(`SELECT COUNT(*)::int AS count FROM update_complaints WHERE status = 'pending'`).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    return res.json({
      ok: true,
      stats: {
        totalUsers: usersCountRes.rows[0]?.count || 0,
        activeUsers: activeUsersRes.rows[0]?.count || 0,
        totalTransactions: txCountRes.rows[0]?.count || 0,
        totalWallets: walletsCountRes.rows[0]?.count || 0,
        pendingDebts: debtsCountRes.rows[0]?.count || 0,
        totalComplaints: complaintsCountRes.rows[0]?.count || 0,
        pendingComplaints: pendingComplaintsRes.rows[0]?.count || 0,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[admin stats error]", err);
    return res.status(500).json({ error: "Statistikani yuklashda xatolik: " + err.message });
  }
});

// =========================================================================
// GET /api/admin/users — Barcha foydalanuvchilar roʻyxati va bogʻliq maʼlumotlar
// =========================================================================
router.get("/users", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
        u.id, 
        u.email, 
        u.username, 
        u.phone_number, 
        u.full_name, 
        u.avatar_url, 
        u.role, 
        u.is_active, 
        u.default_currency, 
        u.language, 
        u.theme, 
        u.created_at, 
        u.last_login_at,
        u.password_hash,
        COALESCE(tx.tx_count, 0)::int AS transactions_count,
        COALESCE(w.w_count, 0)::int AS wallets_count,
        COALESCE(d.d_count, 0)::int AS debts_count,
        COALESCE(ex.ex_count, 0)::int AS exercises_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS tx_count 
        FROM transactions 
        WHERE user_id IS NOT NULL 
        GROUP BY user_id
      ) tx ON tx.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS w_count 
        FROM wallets 
        WHERE user_id IS NOT NULL 
        GROUP BY user_id
      ) w ON w.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS d_count 
        FROM debts 
        WHERE user_id IS NOT NULL 
        GROUP BY user_id
      ) d ON d.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS ex_count 
        FROM exercises 
        WHERE user_id IS NOT NULL 
        GROUP BY user_id
      ) ex ON ex.user_id = u.id
      ORDER BY 
        CASE WHEN u.role = 'admin' THEN 0 ELSE 1 END,
        u.created_at DESC`
    );

    return res.json({
      ok: true,
      count: rows.length,
      users: rows,
    });
  } catch (err) {
    console.error("[admin get users error]", err);
    return res.status(500).json({ error: "Foydalanuvchilarni olishda xatolik: " + err.message });
  }
});

// =========================================================================
// POST /api/admin/users — Yangi foydalanuvchi qoʻshish (Admin paneldan)
// =========================================================================
router.post("/users", async (req, res) => {
  try {
    const { email, password, fullName, username, phoneNumber, role, defaultCurrency } = req.body;

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();
    let cleanUsername = (username || "").trim().toLowerCase();
    const cleanPhone = (phoneNumber || "").trim() || null;
    let cleanFullName = (fullName || "").trim();
    const userRole = role === "admin" ? "admin" : "user";

    if (!cleanEmail) {
      return res.status(400).json({ error: "Gmail (Email) kiritilishi shart" });
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
    }

    if (!cleanUsername) {
      cleanUsername = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");
    }

    if (!cleanFullName) {
      cleanFullName = cleanUsername;
    }

    // Takrorlanmaslik tekshiruvi
    const existing = await pool.query(
      `SELECT id, email, username FROM users WHERE LOWER(email) = $1 OR (username IS NOT NULL AND LOWER(username) = $2) LIMIT 1`,
      [cleanEmail, cleanUsername]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Ushbu Gmail yoki username bilan foydalanuvchi allaqachon mavjud" });
    }

    const passwordHash = await hashPassword(cleanPassword);
    const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const insertResult = await pool.query(
      `INSERT INTO users (
        id, email, username, phone_number, password_hash, full_name,
        role, is_active, default_currency, language, theme, last_login_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
      RETURNING id, email, username, phone_number, full_name, role, is_active, default_currency, language, theme, created_at, password_hash`,
      [
        userId,
        cleanEmail,
        cleanUsername,
        cleanPhone,
        passwordHash,
        cleanFullName,
        userRole,
        true,
        defaultCurrency || "UZS",
        "uz",
        "dark",
      ]
    );

    const newUser = insertResult.rows[0];

    // Hamyonlar ochish
    await ensureUserWallets(userId, pool).catch((err) => {
      console.warn("[admin create user wallets]", err.message);
    });

    return res.status(201).json({
      ok: true,
      message: "Foydalanuvchi muvaffaqiyatli yaratildi",
      user: {
        ...newUser,
        transactions_count: 0,
        wallets_count: 7,
        debts_count: 0,
        exercises_count: 0,
      },
      plainPassword: cleanPassword,
    });
  } catch (err) {
    console.error("[admin create user error]", err);
    return res.status(500).json({ error: "Foydalanuvchi yaratishda xatolik: " + err.message });
  }
});

// =========================================================================
// PUT /api/admin/users/:id/reset-password — Parolni yangilash / tiklash
// (User paroli esidan chiqib qolsa)
// =========================================================================
router.put("/users/:id/reset-password", async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  const cleanPassword = (newPassword || "").trim();
  if (!cleanPassword || cleanPassword.length < 6) {
    return res.status(400).json({ error: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak" });
  }

  try {
    // Foydalanuvchi mavjudligini tekshirish
    const userRes = await pool.query(`SELECT id, email, username, full_name FROM users WHERE id = $1`, [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    const newHash = await hashPassword(cleanPassword);

    await pool.query(
      `UPDATE users 
       SET password_hash = $1, updated_at = now() 
       WHERE id = $2`,
      [newHash, id]
    );

    return res.json({
      ok: true,
      message: "Foydalanuvchi paroli muvaffaqiyatli yangilandi!",
      userId: id,
      newPassword: cleanPassword,
      newHash,
    });
  } catch (err) {
    console.error("[admin reset password error]", err);
    return res.status(500).json({ error: "Parolni yangilashda xatolik: " + err.message });
  }
});

// =========================================================================
// PUT /api/admin/users/:id/status — Foydalanuvchi faolligini oʻzgartirish (Bloklash/Faollashtirish)
// =========================================================================
router.put("/users/:id/status", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    return res.status(400).json({ error: "isActive qiymati boolean (true/false) bo'lishi kerak" });
  }

  // Admin o'zini o'zi bloklamasligi kerak
  if (req.user?.userId === id && !isActive) {
    return res.status(400).json({ error: "Admin o'z hisobini bloklay olmaydi" });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET is_active = $1, updated_at = now() WHERE id = $2 RETURNING id, is_active, email`,
      [isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    return res.json({
      ok: true,
      message: isActive ? "Foydalanuvchi faollashtirildi" : "Foydalanuvchi bloklandi",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("[admin update status error]", err);
    return res.status(500).json({ error: "Holatni yangilashda xatolik: " + err.message });
  }
});

// =========================================================================
// DELETE /api/admin/users/:id — Foydalanuvchini va unga tegishli BARCHA ma'lumotlarni o'chirish
// Savolga javob: "Agar userlar tabledan user o'chirilsa unga tegishli barcha malumotlar ham o'chiriladimi?"
// HA! Barcha jadvallardan (tranzaksiyalar, hamyonlar, qarzlar, mashqlar, snapshot)
// to'liq tranzaksiya (CASCADE) orqali tozalanadi!
// =========================================================================
router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  // 1. Joriy admin o'zini o'zi o'chira olmaydi
  if (req.user?.userId === id) {
    return res.status(400).json({
      error: "O'zingiz kirib turgan Admin hisobini o'chira olmaysiz!",
    });
  }

  // 2. Foydalanuvchi mavjudligini aniqlash
  const userCheck = await pool.query(`SELECT id, email, username, full_name, role FROM users WHERE id = $1`, [id]);
  if (userCheck.rows.length === 0) {
    return res.status(404).json({ error: "O'chirilishi kerak bo'lgan foydalanuvchi topilmadi" });
  }

  const targetUser = userCheck.rows[0];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Mashqlar va jurnallar
    const delLogsRes = await client.query(`DELETE FROM exercise_logs WHERE user_id = $1`, [id]);
    const delExercisesRes = await client.query(`DELETE FROM exercises WHERE user_id = $1`, [id]);

    // 2. Qarzlar va qarz to'lovlari
    const delDebtPaymentsRes = await client.query(`DELETE FROM debt_payments WHERE user_id = $1`, [id]);
    const delDebtsRes = await client.query(`DELETE FROM debts WHERE user_id = $1`, [id]);

    // 3. Tranzaksiyalar va tahrir jurnali
    const delTxEditsRes = await client.query(`DELETE FROM transaction_edits WHERE user_id = $1`, [id]);
    const delTxRes = await client.query(`DELETE FROM transactions WHERE user_id = $1`, [id]);

    // 4. Hamyonlar va eslatmalar
    const delNotesRes = await client.query(`DELETE FROM wallet_notes WHERE user_id = $1`, [id]);
    const delWalletsRes = await client.query(`DELETE FROM wallets WHERE user_id = $1`, [id]);

    // 5. Zaxira nusxa (snapshot)
    const delSnapshotRes = await client.query(`DELETE FROM app_snapshot WHERE user_id = $1`, [id]);

    // 6. Asosiy foydalanuvchini o'chirish
    await client.query(`DELETE FROM users WHERE id = $1`, [id]);

    await client.query("COMMIT");

    return res.json({
      ok: true,
      message: `Foydalanuvchi "${targetUser.full_name || targetUser.email}" va unga tegishli barcha maʼlumotlar toʻliq oʻchirildi.`,
      deletedCounts: {
        transactions: delTxRes.rowCount,
        transactionEdits: delTxEditsRes.rowCount,
        wallets: delWalletsRes.rowCount,
        walletNotes: delNotesRes.rowCount,
        debts: delDebtsRes.rowCount,
        debtPayments: delDebtPaymentsRes.rowCount,
        exercises: delExercisesRes.rowCount,
        exerciseLogs: delLogsRes.rowCount,
        snapshot: delSnapshotRes.rowCount,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[admin delete user error]", err);
    return res.status(500).json({ error: "Foydalanuvchini o'chirishda xatolik yuz berdi: " + err.message });
  } finally {
    client.release();
  }
});

// =========================================================================
// POST /api/admin/hash-tool — Hash laboratoriyasi: Har qanday parolni xeshlash va tekshirish
// =========================================================================
router.post("/hash-tool", async (req, res) => {
  const { password, compareHash } = req.body;

  const rawPassword = String(password || "").trim();
  if (!rawPassword) {
    return res.status(400).json({ error: "Xeshlash uchun parol matni kiritilishi kerak" });
  }

  try {
    const hash = await hashPassword(rawPassword);
    let isMatch = null;

    if (compareHash && typeof compareHash === "string" && compareHash.trim()) {
      isMatch = await verifyPassword(rawPassword, compareHash.trim());
    }

    return res.json({
      ok: true,
      plainText: rawPassword,
      hash,
      algorithm: "Bcrypt (10 raund) + HMAC-SHA256 Pepper maxfiy kalit",
      isMatch,
    });
  } catch (err) {
    return res.status(500).json({ error: "Xeshlashda xatolik: " + err.message });
  }
});

// =========================================================================
// GET /api/admin/complaints — Foydalanuvchilarning barcha shikoyat va takliflari
// =========================================================================
router.get("/complaints", async (req, res) => {
  try {
    const { status, type, search } = req.query;

    let query = `SELECT * FROM update_complaints`;
    const conditions = [];
    const params = [];

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (type && type !== "all") {
      params.push(type);
      conditions.push(`complaint_type = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(
        LOWER(subject) LIKE $${params.length} OR 
        LOWER(message) LIKE $${params.length} OR 
        LOWER(user_name) LIKE $${params.length} OR 
        LOWER(user_email) LIKE $${params.length} OR 
        LOWER(COALESCE(update_version, '')) LIKE $${params.length}
      )`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY 
      CASE WHEN status = 'pending' THEN 0 
           WHEN status = 'in_review' THEN 1 
           WHEN status = 'resolved' THEN 2 
           ELSE 3 END,
      created_at DESC`;

    const { rows } = await pool.query(query, params);

    // Umumiy statistika hisoblash
    const countsRes = await pool.query(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending,
        COUNT(CASE WHEN status = 'in_review' THEN 1 END)::int AS in_review,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END)::int AS resolved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END)::int AS rejected
      FROM update_complaints
    `).catch(() => ({ rows: [{ total: 0, pending: 0, in_review: 0, resolved: 0, rejected: 0 }] }));

    return res.json({
      ok: true,
      count: rows.length,
      complaints: rows,
      stats: countsRes.rows[0] || {},
    });
  } catch (err) {
    console.error("[admin get complaints error]", err);
    return res.status(500).json({ error: "Shikoyatlarni olishda xatolik: " + err.message });
  }
});

// =========================================================================
// PUT /api/admin/complaints/:id/status — Shikoyat holatini yangilash va javob yozish
// =========================================================================
router.put("/complaints/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, adminNotes } = req.body;

  const validStatuses = ["pending", "in_review", "resolved", "rejected"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Noto'g'ri holat tanlandi" });
  }

  try {
    const isResolved = status === "resolved";
    const updateRes = await pool.query(
      `UPDATE update_complaints
       SET 
        status = COALESCE($1, status),
        admin_notes = COALESCE($2, admin_notes),
        admin_id = $3,
        resolved_at = CASE WHEN $4::boolean = true THEN now() ELSE resolved_at END,
        updated_at = now()
       WHERE id = $5
       RETURNING *`,
      [
        status || null,
        adminNotes !== undefined ? adminNotes : null,
        req.user?.userId || "usr_admin",
        isResolved,
        id,
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: "Shikoyat topilmadi" });
    }

    return res.json({
      ok: true,
      message: "Shikoyat holati muvaffaqiyatli yangilandi",
      complaint: updateRes.rows[0],
    });
  } catch (err) {
    console.error("[admin update complaint error]", err);
    return res.status(500).json({ error: "Holatni yangilashda xatolik: " + err.message });
  }
});

// =========================================================================
// DELETE /api/admin/complaints/:id — Shikoyatni oʻchirish
// =========================================================================
router.delete("/complaints/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const delRes = await pool.query(`DELETE FROM update_complaints WHERE id = $1 RETURNING id`, [id]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: "Shikoyat topilmadi" });
    }

    return res.json({
      ok: true,
      message: "Shikoyat oʻchirildi",
    });
  } catch (err) {
    return res.status(500).json({ error: "Shikoyatni oʻchirishda xatolik: " + err.message });
  }
});

export default router;
