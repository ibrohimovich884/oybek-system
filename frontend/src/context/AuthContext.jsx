import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getBackendBaseUrl, API_TIMEOUT_MS } from "../config/apiConfig.js";

const AuthContext = createContext(null);

export const STORAGE_TOKEN_KEY = "oybek_jwt_token";
export const STORAGE_EXPIRES_KEY = "oybek_jwt_expires_at";
export const STORAGE_USER_KEY = "oybek_auth_user";
export const STORAGE_LOCKOUT_KEY = "oybek_auth_lockout_state";

// 30 kunlik (1 oylik) sessiya davomiyligi
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const SYSTEM_PASSWORD = "Oybek-SysteM";

// Rate limiting konfiguratsiyasi (Lokal xavfsizlik himoyasi)
const WINDOW_MS = 60 * 1000; // 1 daqiqalik oyna
const MAX_ATTEMPTS_PER_WINDOW = 3;
const LOCKOUT_DURATIONS_SEC = [30, 60, 120, 300];

function createJwtSession(username = "admin") {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (30 * 24 * 60 * 60); // 30 kun
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payload = btoa(JSON.stringify({ sub: username, role: "admin", system: "Oybek-SysteM", iat: now, exp })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const sig = btoa("oybek_system_secure_signature").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${header}.${payload}.${sig}`;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_TOKEN_KEY) || null;
    } catch {
      return null;
    }
  });

  const [expiresAt, setExpiresAt] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_EXPIRES_KEY);
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : { name: "Oybek", role: "admin" };
    } catch {
      return { name: "Oybek", role: "admin" };
    }
  });

  // Bloklash va urinishlar holati
  const [lockoutState, setLockoutState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LOCKOUT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lockUntil && parsed.lockUntil > Date.now()) {
          return parsed;
        }
      }
    } catch {}
    return {
      lockUntil: 0,
      lockoutStage: 0,
      attempts: [],
    };
  });

  // Sessiya muddati o'tganligini tekshirish
  const isSessionValid = Boolean(
    token && expiresAt && expiresAt > Date.now()
  );

  const [isAuthenticated, setIsAuthenticated] = useState(isSessionValid);

  // Bloklash holatini saqlash
  const saveLockoutState = useCallback((newState) => {
    setLockoutState(newState);
    try {
      localStorage.setItem(STORAGE_LOCKOUT_KEY, JSON.stringify(newState));
    } catch (e) {
      console.warn("Lockout holatini saqlashda xato:", e);
    }
  }, []);

  // Bloklash muddati tugaganini muntazam tekshirish
  useEffect(() => {
    if (!lockoutState.lockUntil) return;

    const timer = setInterval(() => {
      if (Date.now() >= lockoutState.lockUntil) {
        saveLockoutState({
          ...lockoutState,
          lockUntil: 0,
          attempts: [],
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutState, saveLockoutState]);

  // Sessiya tugaganida tozalash
  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_EXPIRES_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch (e) {
      console.warn("Storage tozalashda xato:", e);
    }
    setToken(null);
    setExpiresAt(null);
    setIsAuthenticated(false);
  }, []);

  // Har daqiqada yoki sahifa ochilganda token muddatini tekshirish
  useEffect(() => {
    const checkExpiration = () => {
      if (token && expiresAt) {
        if (Date.now() >= expiresAt) {
          logout();
        } else {
          setIsAuthenticated(true);
        }
      } else {
        setIsAuthenticated(false);
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 60000);
    return () => clearInterval(interval);
  }, [token, expiresAt, logout]);

  // Auth expired hodisasini tinglash (masalan API 401 berganda)
  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };
    window.addEventListener("oybek-auth-expired", handleAuthExpired);
    return () => window.removeEventListener("oybek-auth-expired", handleAuthExpired);
  }, [logout]);

  // Kirish funksiyasi (Progressiv Rate Limiting va 1 oylik JWT sessiya bilan)
  const login = async (passwordInput) => {
    const now = Date.now();

    // 1. Agar hozirda mijoz bloklangan bo'lsa
    if (lockoutState.lockUntil > now) {
      const remainingSec = Math.ceil((lockoutState.lockUntil - now) / 1000);
      return {
        success: false,
        isLocked: true,
        lockUntil: lockoutState.lockUntil,
        retryAfter: remainingSec,
        message: `Xavfsizlik blokirovkasi! ${remainingSec} soniyadan so'ng qayta urinishingiz mumkin.`,
      };
    }

    const trimmed = String(passwordInput || "").trim();
    if (!trimmed) {
      return {
        success: false,
        message: "Iltimos, parolni kiriting!",
      };
    }

    // 1 daqiqadan eski xatolarni tozalash
    const recentAttempts = (lockoutState.attempts || []).filter((ts) => now - ts < WINDOW_MS);

    const isDirectMatch =
      trimmed === SYSTEM_PASSWORD ||
      trimmed.toLowerCase() === SYSTEM_PASSWORD.toLowerCase();
    const expiry = Date.now() + SESSION_DURATION_MS;
    const defaultUser = { name: "Oybek", role: "admin", system: "OYBEK SysteM" };

    // 1. Agar to'g'ri tizim paroli bo'lsa (Oybek-SysteM)
    if (isDirectMatch) {
      let finalToken = createJwtSession("admin");

      // Serverga ham xabardor qilish / server tokenini olishga harakat qilish
      try {
        const baseUrl = getBackendBaseUrl();
        const url = `${baseUrl}/api/auth/login`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "admin",
            password: trimmed,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.status === 429) {
          const data = await res.json();
          const lockTime = data.lockUntil || Date.now() + (data.retryAfter || 30) * 1000;
          saveLockoutState({
            lockUntil: lockTime,
            lockoutStage: data.lockoutStage || 1,
            attempts: [],
          });
          return {
            success: false,
            isLocked: true,
            lockUntil: lockTime,
            retryAfter: data.retryAfter || 30,
            message: data.error || `Tizim ${data.retryAfter || 30} soniyaga bloklandi.`,
          };
        }

        if (res.ok) {
          const data = await res.json();
          if (data?.token) {
            finalToken = data.token;
          }
        }
      } catch (e) {
        console.log("Server auth sync bypass:", e.message);
      }

      // Muvaffaqiyatli kirish: Bloklash holatini tozalash
      saveLockoutState({
        lockUntil: 0,
        lockoutStage: 0,
        attempts: [],
      });

      try {
        localStorage.setItem(STORAGE_TOKEN_KEY, finalToken);
        localStorage.setItem(STORAGE_EXPIRES_KEY, String(expiry));
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(defaultUser));
      } catch (e) {
        console.warn("Storage yozishda xato:", e);
      }

      setToken(finalToken);
      setExpiresAt(expiry);
      setUser(defaultUser);
      setIsAuthenticated(true);

      return {
        success: true,
        message: "Kirish muvaffaqiyatli! 1 oylik xavfsiz sessiya faollashtirildi.",
        expiresAt: expiry,
      };
    }

    // 2. Agar noto'g'ri bo'lsa yoki server orqali tekshirish kerak bo'lsa
    try {
      const baseUrl = getBackendBaseUrl();
      const url = `${baseUrl}/api/auth/login`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "admin",
          password: trimmed,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const jwtToken = data.token || createJwtSession("admin");
        const serverExpiry = data.expiresAt || expiry;
        const userData = data.user || defaultUser;

        // Xatoliklarni tozalash
        saveLockoutState({
          lockUntil: 0,
          lockoutStage: 0,
          attempts: [],
        });

        try {
          localStorage.setItem(STORAGE_TOKEN_KEY, jwtToken);
          localStorage.setItem(STORAGE_EXPIRES_KEY, String(serverExpiry));
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
        } catch (e) {
          console.warn("Storage yozishda xato:", e);
        }

        setToken(jwtToken);
        setExpiresAt(serverExpiry);
        setUser(userData);
        setIsAuthenticated(true);

        return {
          success: true,
          message: "Kirish muvaffaqiyatli! 1 oylik xavfsiz sessiya faollashtirildi.",
          expiresAt: serverExpiry,
        };
      }

      if (res.status === 429) {
        const data = await res.json();
        const lockDuration = (data.retryAfter || 30) * 1000;
        const lockUntil = data.lockUntil || (Date.now() + lockDuration);
        saveLockoutState({
          lockUntil,
          lockoutStage: data.lockoutStage || (lockoutState.lockoutStage + 1),
          attempts: [],
        });

        return {
          success: false,
          isLocked: true,
          lockUntil,
          retryAfter: data.retryAfter || 30,
          message: data.error || `Ko'p marotaba xato qilindi. Tizim ${data.retryAfter || 30} soniyaga bloklandi.`,
        };
      }

      // 401 noto'g'ri parol
      const updatedAttempts = [...recentAttempts, now];
      if (updatedAttempts.length >= MAX_ATTEMPTS_PER_WINDOW) {
        const nextStage = lockoutState.lockoutStage + 1;
        const durationSec = LOCKOUT_DURATIONS_SEC[Math.min(nextStage - 1, LOCKOUT_DURATIONS_SEC.length - 1)];
        const lockUntil = now + durationSec * 1000;

        saveLockoutState({
          lockUntil,
          lockoutStage: nextStage,
          attempts: [],
        });

        return {
          success: false,
          isLocked: true,
          lockUntil,
          retryAfter: durationSec,
          message: `1 daqiqa ichida ${MAX_ATTEMPTS_PER_WINDOW} marta xato parol kiritildi! Tizim ${durationSec} soniyaga bloklandi.`,
        };
      }

      const remaining = MAX_ATTEMPTS_PER_WINDOW - updatedAttempts.length;
      saveLockoutState({
        ...lockoutState,
        attempts: updatedAttempts,
      });

      return {
        success: false,
        remainingAttempts: remaining,
        message: `Noto'g'ri parol! 1 daqiqada qolgan urinishlar: ${remaining} ta`,
      };
    } catch (netErr) {
      // Offline holatda ham lokal rate limiting ishlashi kerak
      const updatedAttempts = [...recentAttempts, now];
      if (updatedAttempts.length >= MAX_ATTEMPTS_PER_WINDOW) {
        const nextStage = lockoutState.lockoutStage + 1;
        const durationSec = LOCKOUT_DURATIONS_SEC[Math.min(nextStage - 1, LOCKOUT_DURATIONS_SEC.length - 1)];
        const lockUntil = now + durationSec * 1000;

        saveLockoutState({
          lockUntil,
          lockoutStage: nextStage,
          attempts: [],
        });

        return {
          success: false,
          isLocked: true,
          lockUntil,
          retryAfter: durationSec,
          message: `1 daqiqa ichida ${MAX_ATTEMPTS_PER_WINDOW} marta xato parol kiritildi! Tizim ${durationSec} soniyaga bloklandi.`,
        };
      }

      const remaining = MAX_ATTEMPTS_PER_WINDOW - updatedAttempts.length;
      saveLockoutState({
        ...lockoutState,
        attempts: updatedAttempts,
      });

      return {
        success: false,
        remainingAttempts: remaining,
        message: `Noto'g'ri parol! 1 daqiqada qolgan urinishlar: ${remaining} ta`,
      };
    }
  };

  // Qolgan kunlarni hisoblash
  const getDaysRemaining = useCallback(() => {
    if (!expiresAt) return 0;
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [expiresAt]);

  const value = {
    token,
    expiresAt,
    user,
    isAuthenticated,
    lockoutState,
    daysRemaining: getDaysRemaining(),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

