import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getBackendBaseUrl, API_TIMEOUT_MS } from "../config/apiConfig.js";

const AuthContext = createContext(null);

export const STORAGE_TOKEN_KEY = "oybek_jwt_token";
export const STORAGE_EXPIRES_KEY = "oybek_jwt_expires_at";
export const STORAGE_USER_KEY = "oybek_auth_user";
export const STORAGE_LOCKOUT_KEY = "oybek_auth_lockout_state";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 kun
const SYSTEM_PASSWORD = "Oybek-SysteM";

const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 5;
const LOCKOUT_DURATIONS_SEC = [30, 60, 120, 300];

function createLocalJwtSession(sub = "admin", name = "Oybek") {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 30 * 24 * 60 * 60;
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const payload = btoa(
    JSON.stringify({
      sub,
      userId: sub,
      role: "admin",
      fullName: name,
      iat: now,
      exp,
    })
  )
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const sig = btoa("oybek_system_secure_signature")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
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
      return saved
        ? JSON.parse(saved)
        : { name: "Oybek", fullName: "Oybek", role: "admin", email: "" };
    } catch {
      return { name: "Oybek", fullName: "Oybek", role: "admin", email: "" };
    }
  });

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

  const isSessionValid = Boolean(token && expiresAt && expiresAt > Date.now());
  const [isAuthenticated, setIsAuthenticated] = useState(isSessionValid);

  const saveLockoutState = useCallback((newState) => {
    setLockoutState(newState);
    try {
      localStorage.setItem(STORAGE_LOCKOUT_KEY, JSON.stringify(newState));
    } catch (e) {
      console.warn("Lockout holatini saqlashda xato:", e);
    }
  }, []);

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
    setUser(null);
    setIsAuthenticated(false);
  }, []);

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

  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };
    window.addEventListener("oybek-auth-expired", handleAuthExpired);
    return () => window.removeEventListener("oybek-auth-expired", handleAuthExpired);
  }, [logout]);

  // Profilni qayta yuklash (masalan serverdan yangi sozlamalarni olish)
  const refreshProfile = useCallback(async () => {
    if (!token) return;
    try {
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          try {
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Profile refresh error:", err.message);
    }
  }, [token]);

  // Ro'yxatdan o'tish (Register)
  const register = async ({ email, password, fullName, username, phoneNumber }) => {
    try {
      const baseUrl = getBackendBaseUrl();
      const url = `${baseUrl}/api/auth/register`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: email?.trim(),
          password: password?.trim(),
          fullName: fullName?.trim(),
          username: username?.trim() || undefined,
          phoneNumber: phoneNumber?.trim() || undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          message: data.error || data.message || "Roʻyxatdan oʻtishda xatolik yuz berdi",
        };
      }

      const jwtToken = data.token;
      const expiry = Date.now() + SESSION_DURATION_MS;
      const userData = data.user || {
        email,
        fullName: fullName || email.split("@")[0],
        username: username || email.split("@")[0],
        role: "user",
      };

      saveLockoutState({
        lockUntil: 0,
        lockoutStage: 0,
        attempts: [],
      });

      try {
        localStorage.setItem(STORAGE_TOKEN_KEY, jwtToken);
        localStorage.setItem(STORAGE_EXPIRES_KEY, String(expiry));
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
      } catch (e) {
        console.warn("Storage yozishda xato:", e);
      }

      setToken(jwtToken);
      setExpiresAt(expiry);
      setUser(userData);
      setIsAuthenticated(true);

      return {
        success: true,
        message: "Muvaffaqiyatli roʻyxatdan oʻtildi! 30 kunlik sessiya ochildi.",
        expiresAt: expiry,
      };
    } catch (err) {
      return {
        success: false,
        message: "Server bilan bogʻlanishda xatolik: " + err.message,
      };
    }
  };

  // Tizimga kirish (Login)
  const login = async (loginIdentifier, passwordInput) => {
    const now = Date.now();

    if (lockoutState.lockUntil > now) {
      const remainingSec = Math.ceil((lockoutState.lockUntil - now) / 1000);
      return {
        success: false,
        isLocked: true,
        lockUntil: lockoutState.lockUntil,
        retryAfter: remainingSec,
        message: `Xavfsizlik blokirovkasi! ${remainingSec} soniyadan soʻng qayta urinishingiz mumkin.`,
      };
    }

    const cleanLogin = String(loginIdentifier || "").trim();
    const cleanPassword = String(passwordInput || "").trim();

    if (!cleanPassword) {
      return {
        success: false,
        message: "Iltimos, parolni kiriting!",
      };
    }

    const recentAttempts = (lockoutState.attempts || []).filter((ts) => now - ts < WINDOW_MS);
    const expiry = Date.now() + SESSION_DURATION_MS;

    try {
      const baseUrl = getBackendBaseUrl();
      const url = `${baseUrl}/api/auth/login`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          login: cleanLogin || undefined,
          email: cleanLogin.includes("@") ? cleanLogin : undefined,
          username: !cleanLogin.includes("@") ? cleanLogin : undefined,
          password: cleanPassword,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const jwtToken = data.token;
        const serverExpiry = data.expiresAt || expiry;
        const userData = data.user || {
          name: cleanLogin || "Oybek",
          fullName: data.user?.fullName || cleanLogin || "Oybek",
          role: data.user?.role || "user",
        };

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
          message: "Tizimga muvaffaqiyatli kirildi. Sessiya 1 oy amal qiladi.",
          expiresAt: serverExpiry,
        };
      }

      if (res.status === 429) {
        const data = await res.json();
        const lockDuration = (data.retryAfter || 30) * 1000;
        const lockUntil = data.lockUntil || Date.now() + lockDuration;
        saveLockoutState({
          lockUntil,
          lockoutStage: data.lockoutStage || lockoutState.lockoutStage + 1,
          attempts: [],
        });

        return {
          success: false,
          isLocked: true,
          lockUntil,
          retryAfter: data.retryAfter || 30,
          message: data.error || `Koʻp marotaba xato qilindi. Tizim ${data.retryAfter || 30} soniyaga bloklandi.`,
        };
      }

      const errorData = await res.json().catch(() => ({}));
      const updatedAttempts = [...recentAttempts, now];

      if (updatedAttempts.length >= MAX_ATTEMPTS_PER_WINDOW) {
        const nextStage = lockoutState.lockoutStage + 1;
        const durationSec =
          LOCKOUT_DURATIONS_SEC[Math.min(nextStage - 1, LOCKOUT_DURATIONS_SEC.length - 1)];
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
        message: errorData.error || `Notoʻgʻri login yoki parol! Qolgan urinishlar: ${remaining} ta`,
      };
    } catch (netErr) {
      // Offline fallback: agar bevosita default tizim paroli bo'lsa
      if (cleanPassword === SYSTEM_PASSWORD) {
        const localToken = createLocalJwtSession(cleanLogin || "admin", cleanLogin || "Oybek");
        const defaultUser = {
          name: cleanLogin || "Oybek",
          fullName: cleanLogin || "Oybek (Admin)",
          role: "admin",
          email: cleanLogin.includes("@") ? cleanLogin : "admin@system.local",
        };

        saveLockoutState({ lockUntil: 0, lockoutStage: 0, attempts: [] });

        try {
          localStorage.setItem(STORAGE_TOKEN_KEY, localToken);
          localStorage.setItem(STORAGE_EXPIRES_KEY, String(expiry));
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(defaultUser));
        } catch {}

        setToken(localToken);
        setExpiresAt(expiry);
        setUser(defaultUser);
        setIsAuthenticated(true);

        return {
          success: true,
          message: "Oflayn rejimda tizimga kirildi.",
          expiresAt: expiry,
        };
      }

      return {
        success: false,
        message: "Server bilan bogʻlanib boʻlmadi. Iltimos, internet yoki server holatini tekshiring.",
      };
    }
  };

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
    register,
    logout,
    refreshProfile,
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
