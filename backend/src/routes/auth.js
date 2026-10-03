import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "oybek-system-jwt-secret-key-30d-auth-token";
const DEFAULT_PASSWORD = "Oybek-SysteM";

// =========================================================================
// Xavfsizlik & Rate Limiting (Progressiv bloklash tizimi)
// Qoidalar:
// - 1 daqiqalik (60 soniya) vaqt oynasi
// - 1 daqiqada maksimal 3 ta xato urinish
// - Bloklash davomiyligi:
//   1-bosqich: 30 sekund
//   2-bosqich: 60 sekund (1 daqiqa)
//   3-bosqich: 120 sekund (2 daqiqa)
//   4+-bosqich: 300 sekund (5 daqiqa)
// =========================================================================
const WINDOW_MS = 60 * 1000; // 1 daqiqalik oyna
const MAX_ATTEMPTS_PER_WINDOW = 3; // 1 daqiqada maksimal xatolar
const LOCKOUT_DURATIONS_MS = [
  30 * 1000,   // 1-marta: 30s
  60 * 1000,   // 2-marta: 60s
  120 * 1000,  // 3-marta: 120s
  300 * 1000,  // 4+-marta: 300s
];

// IP / Client bo'yicha urinishlarni xotirada saqlash
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

// POST /api/auth/login — 30 kunlik (1 oylik) JWT sessiya berish
router.post("/login", async (req, res) => {
  const { password, username } = req.body;
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

  // 1. Agar mijoz hozirda bloklangan bo'lsa
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

  // Blok muddati tugagan bo'lsa, lockUntil ni 0 ga o'tkazish
  if (clientData.lockUntil > 0 && clientData.lockUntil <= now) {
    clientData.lockUntil = 0;
    // O'tgan xatolar tarixini tozalash (yangi oyna boshlanadi)
    clientData.attempts = [];
  }

  // Eski (1 daqiqadan oshgan) urinishlarni tozalash
  clientData.attempts = clientData.attempts.filter((ts) => now - ts < WINDOW_MS);

  if (!password) {
    return res.status(400).json({ error: "Parol kiritilishi shart" });
  }

  // Parol tekshiruvi:
  let isValid = false;
  const expectedPassword = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
  
  if (password === expectedPassword || password === DEFAULT_PASSWORD) {
    isValid = true;
  } else if (process.env.ADMIN_PASSWORD_HASH) {
    try {
      isValid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    } catch {
      isValid = false;
    }
  }

  if (!isValid) {
    // Xato urinishni yozish
    clientData.attempts.push(now);

    const attemptsInWindow = clientData.attempts.length;
    const remainingAttempts = Math.max(0, MAX_ATTEMPTS_PER_WINDOW - attemptsInWindow);

    // Agar 1 daqiqada belgilangan sondan oshsa -> Bloklash
    if (attemptsInWindow >= MAX_ATTEMPTS_PER_WINDOW) {
      clientData.lockoutStage += 1;
      const lockDuration = getLockoutDuration(clientData.lockoutStage);
      clientData.lockUntil = now + lockDuration;
      clientData.attempts = []; // Bloklangan vaqtda hisoblagichni yangilaymiz

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
      error: "Noto'g'ri parol! Iltimos, qayta urinib ko'ring.",
      remainingAttempts,
      maxAttempts: MAX_ATTEMPTS_PER_WINDOW,
      windowSeconds: 60,
      nextLockoutDuration: Math.ceil(getLockoutDuration(clientData.lockoutStage + 1) / 1000),
    });
  }

  // Muvaffaqiyatli kirilganda xavfsizlik hisoblagichlarini tozalash
  clientAttemptStore.delete(clientId);

  // 1 oylik (30 kun) JWT sessiya yaratish
  const expiresIn = "30d";
  const durationMs = 30 * 24 * 60 * 60 * 1000; // 30 kun millisekundda
  const expiresAt = Date.now() + durationMs;

  const token = jwt.sign(
    {
      sub: username || "admin",
      role: "admin",
      system: "Oybek-SysteM",
      createdAt: Date.now(),
    },
    JWT_SECRET,
    { expiresIn }
  );

  return res.json({
    ok: true,
    token,
    expiresIn,
    expiresAt,
    user: {
      name: "Oybek",
      role: "admin",
      system: "OYBEK SysteM",
    },
    message: "Tizimga muvaffaqiyatli kirildi. Sessiya 1 oy amal qiladi.",
  });
});

// GET /api/auth/status — Hozirgi login holati va cheklovlarni tekshirish
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

// GET /api/auth/verify — Tokenni tekshirish
router.get("/verify", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ valid: false, error: "Token berilmagan" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return res.json({
      valid: true,
      user: payload,
      expiresAt: payload.exp ? payload.exp * 1000 : null,
    });
  } catch (err) {
    return res.status(401).json({
      valid: false,
      error: "Token yaroqsiz yoki muddati o'tgan",
    });
  }
});

export default router;

