/**
 * Backend API Konfiguratsiyasi (OYBEK SysteM)
 * 
 * Asosiy backend server: https://oybek-system-backend-1.onrender.com
 * Agar o'zgartirish kerak bo'lsa, .env (VITE_BACKEND_URL / VITE_BACKEND_PORT)
 * yoki localStorage orqali o'zgartirish mumkin.
 */

export const DEFAULT_BACKEND_URL = "https://oybek-system-backend-1.onrender.com";
export const DEFAULT_BACKEND_PORT = 5000;

const STORAGE_URL_KEY = "oybek_system:backend_url";
const STORAGE_PORT_KEY = "oybek_system:backend_port";

/**
 * Backendning to'liq asosiy manzilini olish
 */
export function getBackendBaseUrl() {
  // 1. Agar foydalanuvchi maxsus URL saqlagan bo'lsa
  const savedUrl = typeof window !== "undefined" ? localStorage.getItem(STORAGE_URL_KEY) : null;
  if (savedUrl && typeof savedUrl === "string" && savedUrl.trim()) {
    return savedUrl.trim().replace(/\/+$/, "");
  }

  // 2. Agar .env orqali VITE_BACKEND_URL berilgan bo'lsa
  const envUrl = import.meta.env?.VITE_BACKEND_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  // 3. Agar .env orqali port berilgan bo'lsa
  const envPort = import.meta.env?.VITE_BACKEND_PORT;
  if (envPort && !isNaN(Number(envPort))) {
    return `http://localhost:${envPort}`;
  }

  // 4. Standart production backend
  return DEFAULT_BACKEND_URL;
}

/**
 * Backend manzilini yangilash
 */
export function setBackendBaseUrl(url) {
  if (!url || typeof url !== "string") return;
  localStorage.setItem(STORAGE_URL_KEY, url.trim().replace(/\/+$/, ""));
}

/**
 * Backend portini olish (localhost uchun)
 */
export function getBackendPort() {
  const savedPort = typeof window !== "undefined" ? localStorage.getItem(STORAGE_PORT_KEY) : null;
  if (savedPort && !isNaN(Number(savedPort))) {
    return Number(savedPort);
  }
  const envPort = import.meta.env?.VITE_BACKEND_PORT;
  if (envPort && !isNaN(Number(envPort))) {
    return Number(envPort);
  }
  return DEFAULT_BACKEND_PORT;
}

/**
 * Backend portini yangilash
 */
export function setBackendPort(port) {
  if (!port || isNaN(Number(port))) return;
  localStorage.setItem(STORAGE_PORT_KEY, String(port));
}

/**
 * API marshrutlari (Routes)
 */
export const API_ENDPOINTS = {
  HEALTH: "/api/health",
  EXPENSES: "/api/expenses",
  EXPENSE_DETAIL: (id) => `/api/expenses/${encodeURIComponent(id)}`,
  WALLETS: "/api/wallets",
  BACKUP: "/api/backup",
  EXERCISES: "/api/exercises",
  EXERCISE_LOGS: "/api/exercises/logs",
};

export const API_TIMEOUT_MS = 6000;

