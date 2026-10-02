import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getBackendBaseUrl, API_TIMEOUT_MS } from "../config/apiConfig.js";

const AuthContext = createContext(null);

export const STORAGE_TOKEN_KEY = "oybek_jwt_token";
export const STORAGE_EXPIRES_KEY = "oybek_jwt_expires_at";
export const STORAGE_USER_KEY = "oybek_auth_user";

// 30 kunlik (1 oylik) sessiya davomiyligi
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const SYSTEM_PASSWORD = "Oybek-SysteM";

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

  // Sessiya muddati o'tganligini tekshirish
  const isSessionValid = Boolean(
    token && expiresAt && expiresAt > Date.now()
  );

  const [isAuthenticated, setIsAuthenticated] = useState(isSessionValid);

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

  // Kirish funksiyasi (1 oylik JWT sessiya)
  const login = async (passwordInput) => {
    const trimmed = String(passwordInput || "").trim();

    if (!trimmed) {
      return {
        success: false,
        message: "Iltimos, parolni kiriting!",
      };
    }

    const isDirectMatch =
      trimmed === SYSTEM_PASSWORD ||
      trimmed.toLowerCase() === SYSTEM_PASSWORD.toLowerCase();
    const expiry = Date.now() + SESSION_DURATION_MS;
    const defaultUser = { name: "Oybek", role: "admin", system: "OYBEK SysteM" };

    // 1. Tizim paroli bo'lsa (Oybek-SysteM) — zudlik bilan 1 oylik JWT sessiya bilan tasdiqlash
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

        if (res.ok) {
          const data = await res.json();
          if (data?.token) {
            finalToken = data.token;
          }
        }
      } catch (e) {
        // Server uyg'onmagan bo'lsa ham offline JWT sessiya ochiladi
        console.log("Server auth sync bypass:", e.message);
      }

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

    // 2. Agar boshqa parol kiritilgan bo'lsa, server orqali tekshirish
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
      } else {
        return {
          success: false,
          message: "Noto'g'ri parol! Qayta urinib ko'ring.",
        };
      }
    } catch (netErr) {
      return {
        success: false,
        message: "Noto'g'ri parol! Qayta urinib ko'ring.",
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
