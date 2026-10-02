import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "oybek-system-jwt-secret-key-30d-auth-token";
const DEFAULT_PASSWORD = "Oybek-SysteM";

// POST /api/auth/login — 30 kunlik (1 oylik) JWT sessiya berish
router.post("/login", async (req, res) => {
  const { password, username } = req.body;

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
    return res.status(401).json({
      error: "Parol noto'g'ri! Iltimos, qayta urinib ko'ring.",
    });
  }

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

