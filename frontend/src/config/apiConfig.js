/**
 * Backend API Konfiguratsiyasi (OYBEK SysteM)
 * 
 * Production: frontend va backend BITTA Render servisida ishlaydi, shuning uchun
 * API so'rovlari o'sha manzilning o'ziga (nisbiy yo'l, "/api/...") yuboriladi.
 * Kerak bo'lsa, .env (VITE_BACKEND_URL / VITE_BACKEND_PORT) yoki Sozlamalar sahifasi
 * orqali boshqa serverga yo'naltirish mumkin.
 */

// Bo'sh qator = "shu saytning o'zi" (same-origin). Frontend backend bilan bir joyda turadi.
export const DEFAULT_BACKEND_URL = "";
export const DEFAULT_BACKEND_PORT = 5000;

// v2: eski alohida Render backend manzili (agar brauzerda saqlangan bo'lsa) endi ishlatilmasin
const STORAGE_URL_KEY = "oybek_system:backend_url_v2";
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

  // 4. Lokal dev rejimida (npm run dev) — lokal backendga ulanamiz,
  //    production build'da esa shu sayt bilan bir xil manzil (nisbiy yo'l).
  if (import.meta.env?.DEV) {
    return `http://localhost:${DEFAULT_BACKEND_PORT}`;
  }
  return DEFAULT_BACKEND_URL;
}

/**
 * Backend manzilini yangilash
 */
export function setBackendBaseUrl(url) {
  // Bo'sh qiymat = standart holatga qaytish (saqlangan manzilni o'chirish)
  if (!url || typeof url !== "string" || !url.trim()) {
    localStorage.removeItem(STORAGE_URL_KEY);
    return;
  }
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
  SNAPSHOT: "/api/snapshot",
};

// Render (bepul tarif) uxlab qolgan servisni uyg'otishi 30-60s olishi mumkin
export const API_TIMEOUT_MS = 60000;

