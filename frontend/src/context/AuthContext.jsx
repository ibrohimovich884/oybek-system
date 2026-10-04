import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getBackendBaseUrl, API_TIMEOUT_MS } from "../config/apiConfig.js";
import { DEFAULT_WALLETS } from "../constants/money.js";
import { getUserStorageKey } from "../utils/storageKeys.js";

const AuthContext = createContext(null);

export const STORAGE_TOKEN_KEY = "oybek_jwt_token";
export const STORAGE_EXPIRES_KEY = "oybek_jwt_expires_at";
export const STORAGE_USER_KEY = "oybek_auth_user";
export const STORAGE_LOCKOUT_KEY = "oybek_auth_lockout_state";
export const STORAGE_REGISTERED_USERS_KEY = "oybek_registered_users_db";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 kun
const SYSTEM_PASSWORD = "Oybek-SysteM";

const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 5;
const LOCKOUT_DURATIONS_SEC = [30, 60, 120, 300];

function createLocalJwtSession(userId, name = "Oybek", email = "", role = "user") {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 30 * 24 * 60 * 60;
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const payload = btoa(
    JSON.stringify({
      sub: userId,
      userId,
      id: userId,
      role,
      email,
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

function getLocalUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_REGISTERED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalUser(newUser) {
  try {
    const users = getLocalUsers();
    const filtered = users.filter(
      (u) => u.email.toLowerCase() !== newUser.email.toLowerCase() && u.id !== newUser.id
    );
    filtered.push(newUser);
    localStorage.setItem(STORAGE_REGISTERED_USERS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn("Local user save error:", e);
  }
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
      if (saved) {
        const val = parseInt(saved, 10);
        if (val > Date.now()) return val;
      }
      // Agar token bor-u lekin expiresAt eski yoki yo'q bo'lsa: 30 kunga sozlaymiz
      const hasToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      if (hasToken) {
        const freshExpiry = Date.now() + SESSION_DURATION_MS;
        localStorage.setItem(STORAGE_EXPIRES_KEY, String(freshExpiry));
        return freshExpiry;
      }
      return null;
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

  const isSessionValid = Boolean(token && (!expiresAt || expiresAt > Date.now()));
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
      localStorage.removeItem(STORAGE_LOCKOUT_KEY);
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.clear();
      }
    } catch (e) {
      console.warn("Storage tozalashda xato:", e);
    }
    setToken(null);
    setExpiresAt(null);
    setUser(null);
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("oybek:user-changed"));
    }
  }, []);

  // Faqat 30 kunlik haqiqiy muddat tugaganida chiqish
  useEffect(() => {
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    const checkExpiration = () => {
      if (expiresAt && Date.now() >= expiresAt) {
        logout();
      } else {
        setIsAuthenticated(true);
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 60000);
    return () => clearInterval(interval);
  }, [token, expiresAt, logout]);

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
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();
    const cleanFullName = (fullName || "").trim() || cleanEmail.split("@")[0];
    const cleanUsername = (username || "").trim() || cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");
    const cleanPhone = (phoneNumber || "").trim() || null;

    if (!cleanEmail) {
      return { success: false, message: "Gmail (Email) kiritilishi shart" };
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return { success: false, message: "Parol kamida 6 ta belgidan iborat boʻlishi kerak" };
    }

    let serverSuccess = false;
    let jwtToken = null;
    let userData = null;
    let serverExpiry = Date.now() + SESSION_DURATION_MS;

    try {
      const baseUrl = getBackendBaseUrl();
      const url = `${baseUrl}/api/auth/register`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
          fullName: cleanFullName,
          username: cleanUsername,
          phoneNumber: cleanPhone,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        serverSuccess = true;
        jwtToken = data.token;
        userData = data.user;
      } else if (res.status === 409) {
        return {
          success: false,
          message: data.error || "Ushbu Gmail yoki username bilan allaqachon roʻyxatdan oʻtilgan!",
        };
      } else if (res.status === 400) {
        return {
          success: false,
          message: data.error || "Maʼlumotlar toʻliq kiritilmadi.",
        };
      }
    } catch (netErr) {
      console.warn("Server register offline fallback:", netErr.message);
    }

    // Server javob bermasa yoki 404 bo'lsa -> Barqaror mahalliy ro'yxatdan o'tkazish
    if (!serverSuccess || !jwtToken) {
      const localUserId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      jwtToken = createLocalJwtSession(localUserId, cleanFullName, cleanEmail, "user");
      userData = {
        id: localUserId,
        userId: localUserId,
        email: cleanEmail,
        username: cleanUsername,
        phoneNumber: cleanPhone,
        fullName: cleanFullName,
        name: cleanFullName,
        role: "user",
        defaultCurrency: "UZS",
        language: "uz",
        theme: "dark",
        password: cleanPassword,
      };
      saveLocalUser(userData);
    }

    saveLockoutState({
      lockUntil: 0,
      lockoutStage: 0,
      attempts: [],
    });

    try {
      localStorage.setItem(STORAGE_TOKEN_KEY, jwtToken);
      localStorage.setItem(STORAGE_EXPIRES_KEY, String(serverExpiry));
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));

      // Yangi foydalanuvchining hamyonlari to'liq 0 bilan boshlanishini kafolatlash
      const uid = userData?.id || userData?.userId;
      if (uid) {
        const walletsKey = getUserStorageKey("oybek-system:wallets", uid);
        localStorage.setItem(walletsKey, JSON.stringify(DEFAULT_WALLETS));
        const expensesKey = getUserStorageKey("oybek-system:expenses", uid);
        if (!localStorage.getItem(expensesKey)) {
          localStorage.setItem(expensesKey, JSON.stringify([]));
        }
      }
    } catch (e) {
      console.warn("Storage yozishda xato:", e);
    }

    setToken(jwtToken);
    setExpiresAt(serverExpiry);
    setUser(userData);
    setIsAuthenticated(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("oybek:user-changed"));
    }

    return {
      success: true,
      message: "Muvaffaqiyatli roʻyxatdan oʻtildi! 30 kunlik xavfsiz sessiya faollashdi.",
      expiresAt: serverExpiry,
    };
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

    const cleanLogin = String(loginIdentifier || "").trim().toLowerCase();
    const cleanPassword = String(passwordInput || "").trim();

    if (!cleanPassword) {
      return {
        success: false,
        message: "Iltimos, parolni kiriting!",
      };
    }

    const recentAttempts = (lockoutState.attempts || []).filter((ts) => now - ts < WINDOW_MS);
    const expiry = Date.now() + SESSION_DURATION_MS;

    let serverSuccess = false;
    let jwtToken = null;
    let userData = null;
    let serverExpiry = expiry;

    try {
      const baseUrl = getBackendBaseUrl();
      const url = `${baseUrl}/api/auth/login`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

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
        if (data.ok && data.token) {
          serverSuccess = true;
          jwtToken = data.token;
          serverExpiry = data.expiresAt || expiry;
          userData = data.user;
        }
      } else if (res.status === 429) {
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
    } catch (netErr) {
      console.warn("Server login network/offline fallback:", netErr.message);
    }

    if (serverSuccess && jwtToken && userData) {
      saveLockoutState({ lockUntil: 0, lockoutStage: 0, attempts: [] });
      try {
        localStorage.setItem(STORAGE_TOKEN_KEY, jwtToken);
        localStorage.setItem(STORAGE_EXPIRES_KEY, String(serverExpiry));
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
      } catch {}

      setToken(jwtToken);
      setExpiresAt(serverExpiry);
      setUser(userData);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oybek:user-changed"));
      }

      return {
        success: true,
        message: "Tizimga muvaffaqiyatli kirildi.",
        expiresAt: serverExpiry,
      };
    }

    // Mahalliy ro'yxatdan o'tgan userlarni tekshirish
    const localUsers = getLocalUsers();
    const matchedUser = localUsers.find(
      (u) =>
        (u.email?.toLowerCase() === cleanLogin ||
          u.username?.toLowerCase() === cleanLogin ||
          u.phoneNumber === cleanLogin) &&
        u.password === cleanPassword
    );

    if (matchedUser) {
      jwtToken = createLocalJwtSession(
        matchedUser.id,
        matchedUser.fullName || matchedUser.name,
        matchedUser.email,
        matchedUser.role || "user"
      );
      saveLockoutState({ lockUntil: 0, lockoutStage: 0, attempts: [] });

      try {
        localStorage.setItem(STORAGE_TOKEN_KEY, jwtToken);
        localStorage.setItem(STORAGE_EXPIRES_KEY, String(expiry));
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(matchedUser));
      } catch {}

      setToken(jwtToken);
      setExpiresAt(expiry);
      setUser(matchedUser);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oybek:user-changed"));
      }

      return {
        success: true,
        message: "Tizimga muvaffaqiyatli kirildi.",
        expiresAt: expiry,
      };
    }

    // Standart tizim paroli (Oybe-SysteM / Oybek-SysteM)
    const isSystemAdminPw =
      cleanPassword === "Oybe-SysteM" ||
      cleanPassword.toLowerCase() === "oybe-system" ||
      cleanPassword === SYSTEM_PASSWORD ||
      cleanPassword.toLowerCase() === SYSTEM_PASSWORD.toLowerCase();

    if (isSystemAdminPw) {
      const defaultUser = {
        id: "usr_admin",
        name: cleanLogin === "admin" ? "Admin" : cleanLogin || "Admin",
        fullName: "Admin (Oybek SysteM)",
        username: "admin",
        role: "admin",
        email: cleanLogin && cleanLogin.includes("@") ? cleanLogin : "admin@system.local",
      };
      jwtToken = createLocalJwtSession("usr_admin", defaultUser.fullName, defaultUser.email, "admin");

      saveLockoutState({ lockUntil: 0, lockoutStage: 0, attempts: [] });

      try {
        localStorage.setItem(STORAGE_TOKEN_KEY, jwtToken);
        localStorage.setItem(STORAGE_EXPIRES_KEY, String(expiry));
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(defaultUser));
      } catch {}

      setToken(jwtToken);
      setExpiresAt(expiry);
      setUser(defaultUser);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oybek:user-changed"));
      }

      return {
        success: true,
        message: "Admin sifatida tizimga muvaffaqiyatli kirildi.",
        expiresAt: expiry,
      };
    }

    // Noto'g'ri parol bo'lsa
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
      message: `Notoʻgʻri login yoki parol! Qolgan urinishlar: ${remaining} ta`,
    };
  };

  const getDaysRemaining = useCallback(() => {
    if (!expiresAt) return 30;
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
