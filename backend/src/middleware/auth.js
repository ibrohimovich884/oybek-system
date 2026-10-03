import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET || "oybek-system-jwt-secret-key-30d-auth-token";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: "Token berilmagan (Avtorizatsiya talab qilinadi)",
      code: "AUTH_REQUIRED",
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.userId || payload.sub || payload.id || "admin";
    req.user = {
      ...payload,
      userId,
      id: userId,
      email: payload.email,
      username: payload.username,
      role: payload.role || "user",
    };
    next();
  } catch (err) {
    return res.status(401).json({
      error: "Token yaroqsiz yoki muddati o'tgan",
      code: "TOKEN_EXPIRED",
    });
  }
}
