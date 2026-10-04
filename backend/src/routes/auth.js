import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../../db/pool.js";
import { JWT_SECRET, requireAuth } from "../middleware/auth.js";
import { ensureUserWallets } from "../services/walletsService.js";
import { hashPassword, verifyPassword, SECRET_KEY } from "../utils/security.js";

const router = Router();
const DEFAULT_PASSWORD = SECRET_KEY;

// =========================================================================
// Xavfsizlik & Rate Limiting (Progressiv bloklash tizimi)
// =========================================================================
const WINDOW_MS = 60 * 1000; // 1 daqiqalik oyna
const MAX_ATTEMPTS_PER_WINDOW = 5; // 1 daqiqada maksimal xatolar
const LOCKOUT_DURATIONS_MS = [
  30 * 1000,   // 1-marta: 30s
  60 * 1000,   // 2-marta: 60s
  120 * 1000,  // 3-marta: 120s
  300 * 1000,  // 4+-marta: 300s
];

const clientAttemptStore = new Map();

function getClientIdentifier(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded ? String(forwarded).split(",")[0].trim() : req.socket?.remoteAddress || "client-local";
  return ip;
}

function getLockoutDuration(stage) {
  const idx = Math.max(0, Math.min(stage - 1, LOCKOUT_DURATIONS_MS.length - 1));
  return LOCKOUT_DURATIONS_MS[idx];
}

// =========================================================================
// Yordamchi: Yangi foydalanuvchi uchun 7 ta standart hamyon ochish
// =========================================================================
export async function createDefaultWalletsForUser(userId, client = pool) {
  await ensureUserWallets(userId, client).catch((err) => {
    console.warn(`[createDefaultWalletsForUser] Warning: ${err.message}`);
  });
}

// =========================================================================
// POST /api/auth/register — Yangi foydalanuvchini roʻyxatdan oʻtkazish
// =========================================================================
router.post("/register", async (req, res) => {
  try {
    const {
      email,
      password,
      username,
      phoneNumber,
      phone_number,
      fullName,
      full_name,
      defaultCurrency,
      default_currency,
      language,
      theme,
    } = req.body;

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();
    let cleanUsername = (username || "").trim().toLowerCase();
    const cleanPhone = (phoneNumber || phone_number || "").trim() || null;
    let cleanFullName = (fullName || full_name || "").trim();

    // 1. Validatsiyalar
    if (!cleanEmail) {
      return res.status(400).json({ error: "Gmail (Email) kiritilishi shart" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: "Email formati noto'g'ri (masalan: misol@gmail.com)" });
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
    }

    // Agar username berilmagan bo'lsa email prefixidan avtomatik olamiz
    if (!cleanUsername) {
      cleanUsername = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");
    }

    if (!cleanFullName) {
      cleanFullName = cleanUsername;
    }

    // 2. Email yoki Username takrorlanmasligini tekshirish
    const existing = await pool.query(
      `SELECT id, email, username FROM users WHERE LOWER(email) = $1 OR (username IS NOT NULL AND LOWER(username) = $2) LIMIT 1`,
      [cleanEmail, cleanUsername]
    );

    if (existing.rows.length > 0) {
      const match = existing.rows[0];
      if (match.email?.toLowerCase() === cleanEmail) {
        return res.status(409).json({ error: "Ushbu Gmail bilan allaqachon roʻyxatdan oʻtilgan" });
      }
      return res.status(409).json({ error: "Ushbu username allaqachon band qilingan" });
    }

    // 3. Parolni xavfsiz maxfiy kalit bilan xeshlash
    const passwordHash = await hashPassword(cleanPassword);

    // 4. Yangi foydalanuvchi ID si
    const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    // 5. Bazaga foydalanuvchini yozish
    const insertResult = await pool.query(
      `INSERT INTO users (
        id, email, username, phone_number, password_hash, full_name,
        role, is_active, default_currency, language, theme, last_login_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
      RETURNING id, email, username, phone_number, full_name, role, is_active, default_currency, language, theme, created_at`,
      [
        userId,
        cleanEmail,
        cleanUsername,
        cleanPhone,
        passwordHash,
        cleanFullName,
        "user",
        true,
        defaultCurrency || default_currency || "UZS",
        language || "uz",
        theme || "dark",
      ]
    );

    const newUser = insertResult.rows[0];

    // 6. Foydalanuvchi uchun avtomatik 7 ta standart hamyon ochish
    await createDefaultWalletsForUser(userId);

    // 7. 30 kunlik JWT sessiya token yaratish
    const token = jwt.sign(
      {
        userId: newUser.id,
        id: newUser.id,
        sub: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        fullName: newUser.full_name,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.status(201).json({
      ok: true,
      message: "Muvaffaqiyatli roʻyxatdan oʻtildi!",
      token,
      expiresIn: "30d",
      user: {
        id: newUser.id,
        userId: newUser.id,
        email: newUser.email,
        username: newUser.username,
        phoneNumber: newUser.phone_number,
        fullName: newUser.full_name,
        role: newUser.role,
        defaultCurrency: newUser.default_currency,
        language: newUser.language,
        theme: newUser.theme,
        createdAt: newUser.created_at,
      },
    });
  } catch (err) {
    console.error("[register error]", err);
    return res.status(500).json({ error: "Roʻyxatdan oʻtishda server xatosi: " + err.message });
  }
});

// =========================================================================
// POST /api/auth/login — Email yoki username orqali tizimga kirish
// =========================================================================
router.post("/login", async (req, res) => {
  const { password, login, username, email } = req.body;
  const loginIdentifier = ((login || email || username || "") + "").trim().toLowerCase();
  const rawPassword = (password || "").trim();

  const clientId = getClientIdentifier(req);
  const now = Date.now();

  let clientData = clientAttemptStore.get(clientId);
  if (!clientData) {
    clientData = {
      attempts: [],
      lockoutStage: 0,
      lockUntil: 0,
    };
    clientAttemptStore.set(clientId, clientData);
  }

  // 1. Agar mijoz bloklangan bo'lsa
  if (clientData.lockUntil > now) {
    const remainingMs = clientData.lockUntil - now;
    const retryAfterSec = Math.ceil(remainingMs / 1000);
    return res.status(429).json({
      error: `Koʻp marotaba xato parol kiritildi! Xavfsizlik yuzasidan tizim ${retryAfterSec} soniyaga bloklandi.`,
      retryAfter: retryAfterSec,
      lockUntil: clientData.lockUntil,
      isLocked: true,
      lockoutStage: clientData.lockoutStage,
      code: "AUTH_LOCKED",
    });
  }

  if (clientData.lockUntil > 0 && clientData.lockUntil <= now) {
    clientData.lockUntil = 0;
    clientData.attempts = [];
  }

  clientData.attempts = clientData.attempts.filter((ts) => now - ts < WINDOW_MS);

  if (!rawPassword) {
    return res.status(400).json({ error: "Parol kiritilishi shart" });
  }

  try {
    let user = null;
    let isPasswordValid = false;

    // 2. Foydalanuvchini bazadan qidirish (email, username yoki phone_number bo'yicha)
    if (loginIdentifier) {
      const { rows } = await pool.query(
        `SELECT * FROM users 
         WHERE LOWER(email) = $1 
            OR (username IS NOT NULL AND LOWER(username) = $1)
            OR (phone_number IS NOT NULL AND phone_number = $1)
         LIMIT 1`,
        [loginIdentifier]
      );
      if (rows.length > 0) {
        user = rows[0];
      }
    }

    // 3. Parolni tekshirish (Maxfiy kalit bilan)
    if (user && user.password_hash) {
      isPasswordValid = await verifyPassword(rawPassword, user.password_hash);
    } else {
      // Orqaga moslik / Legacy Admin tekshiruvi:
      const expectedPassword = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
      if (rawPassword === expectedPassword || rawPassword.toLowerCase() === expectedPassword.toLowerCase()) {
        isPasswordValid = true;
        user = {
          id: "usr_admin",
          email: "admin@system.local",
          username: "admin",
          phone_number: null,
          full_name: "Oybek (Admin)",
          role: "admin",
          is_active: true,
          default_currency: "UZS",
          language: "uz",
          theme: "dark",
        };
      }
    }

    // 4. Agar parol xato bo'lsa
    if (!isPasswordValid || !user) {
      clientData.attempts.push(now);
      const attemptsInWindow = clientData.attempts.length;
      const remainingAttempts = Math.max(0, MAX_ATTEMPTS_PER_WINDOW - attemptsInWindow);

      if (attemptsInWindow >= MAX_ATTEMPTS_PER_WINDOW) {
        clientData.lockoutStage += 1;
        const lockDuration = getLockoutDuration(clientData.lockoutStage);
        clientData.lockUntil = now + lockDuration;
        clientData.attempts = [];

        const lockSeconds = Math.ceil(lockDuration / 1000);
        return res.status(429).json({
          error: `1 daqiqa ichida ${MAX_ATTEMPTS_PER_WINDOW} marta xato parol kiritildi! Tizim ${lockSeconds} soniyaga bloklandi.`,
          retryAfter: lockSeconds,
          lockUntil: clientData.lockUntil,
          isLocked: true,
          lockoutStage: clientData.lockoutStage,
          code: "AUTH_LOCKED",
        });
      }

      return res.status(401).json({
        error: "Noto'g'ri email/login yoki parol! Iltimos, qayta tekshirib urinib ko'ring.",
        remainingAttempts,
        maxAttempts: MAX_ATTEMPTS_PER_WINDOW,
      });
    }

    // 5. Hisob faolligini tekshirish
    if (user.is_active === false) {
      return res.status(403).json({ error: "Foydalanuvchi hisobi faol emas yoki bloklangan." });
    }

    // Muvaffaqiyatli kirish: hisoblagichlarni tozalash
    clientAttemptStore.delete(clientId);

    // Bazada last_login_at ni yangilash
    if (user.id !== "usr_admin") {
      await pool.query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]).catch(() => {});
    }

    // 6. JWT token berish (30 kunlik)
    const expiresIn = "30d";
    const token = jwt.sign(
      {
        userId: user.id,
        id: user.id,
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role || "user",
        fullName: user.full_name || user.name || "User",
      },
      JWT_SECRET,
      { expiresIn }
    );

    return res.json({
      ok: true,
      message: "Tizimga muvaffaqiyatli kirildi.",
      token,
      expiresIn,
      user: {
        id: user.id,
        userId: user.id,
        email: user.email,
        username: user.username,
        phoneNumber: user.phone_number,
        fullName: user.full_name || user.name || "User",
        role: user.role || "user",
        defaultCurrency: user.default_currency || "UZS",
        language: user.language || "uz",
        theme: user.theme || "dark",
      },
    });
  } catch (err) {
    console.error("[login error]", err);
    return res.status(500).json({ error: "Tizimga kirishda server xatosi: " + err.message });
  }
});

// =========================================================================
// GET /api/auth/me — Joriy autentifikatsiya qilingan foydalanuvchi profili
// =========================================================================
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { rows } = await pool.query(
      `SELECT id, email, username, phone_number, full_name, avatar_url, role, 
              is_active, default_currency, language, theme, timezone, created_at, last_login_at
       FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      // Legacy admin uchun fallback
      return res.json({
        ok: true,
        user: {
          id: userId,
          userId,
          email: req.user.email || "admin@system.local",
          username: req.user.username || "admin",
          fullName: req.user.fullName || "Oybek (Admin)",
          role: req.user.role || "admin",
          defaultCurrency: "UZS",
          language: "uz",
          theme: "dark",
        },
      });
    }

    const u = rows[0];
    return res.json({
      ok: true,
      user: {
        id: u.id,
        userId: u.id,
        email: u.email,
        username: u.username,
        phoneNumber: u.phone_number,
        fullName: u.full_name,
        avatarUrl: u.avatar_url,
        role: u.role,
        isActive: u.is_active,
        defaultCurrency: u.default_currency,
        language: u.language,
        theme: u.theme,
        timezone: u.timezone,
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Profilni yuklashda xatolik: " + err.message });
  }
});

// =========================================================================
// GET /api/auth/verify — Tokenni tekshirish
// =========================================================================
router.get("/verify", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ valid: false, error: "Token berilmagan" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.userId || payload.sub || payload.id;
    return res.json({
      valid: true,
      user: {
        ...payload,
        userId,
        id: userId,
      },
      expiresAt: payload.exp ? payload.exp * 1000 : null,
    });
  } catch (err) {
    return res.status(401).json({
      valid: false,
      error: "Token yaroqsiz yoki muddati o'tgan",
    });
  }
});

// =========================================================================
// GET /api/auth/status — Rate limit holati
// =========================================================================
router.get("/status", (req, res) => {
  const clientId = getClientIdentifier(req);
  const now = Date.now();
  const clientData = clientAttemptStore.get(clientId);

  if (!clientData) {
    return res.json({ isLocked: false, remainingAttempts: MAX_ATTEMPTS_PER_WINDOW });
  }

  if (clientData.lockUntil > now) {
    const remainingMs = clientData.lockUntil - now;
    return res.json({
      isLocked: true,
      retryAfter: Math.ceil(remainingMs / 1000),
      lockUntil: clientData.lockUntil,
      lockoutStage: clientData.lockoutStage,
    });
  }

  const validAttempts = clientData.attempts.filter((ts) => now - ts < WINDOW_MS);
  const remaining = Math.max(0, MAX_ATTEMPTS_PER_WINDOW - validAttempts.length);

  return res.json({
    isLocked: false,
    remainingAttempts: remaining,
    maxAttempts: MAX_ATTEMPTS_PER_WINDOW,
    lockoutStage: clientData.lockoutStage,
  });
});

// =========================================================================
// GET /api/auth/users — Bazadagi barcha roʻyxatdan oʻtgan foydalanuvchilar roʻyxati
// =========================================================================
router.get("/users", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, username, phone_number, full_name, avatar_url, role, 
              is_active, default_currency, language, created_at, last_login_at
       FROM users
       ORDER BY created_at DESC`
    );
    return res.json({ ok: true, count: rows.length, users: rows });
  } catch (err) {
    return res.status(500).json({ error: "Foydalanuvchilarni olishda xatolik: " + err.message });
  }
});

export default router;
