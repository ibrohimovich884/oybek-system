/**
 * Backend API Konfiguratsiyasi (OYBEK SysteM)
 * 
 * Production: frontend va backend BITTA Render servisida ishlaydi, shuning uchun
 * API so'rovlari o'sha manzilning o'ziga (nisbiy yo'l, "/api/...") yuboriladi.
 * Kerak bo'lsa, .env (VITE_BACKEND_URL / VITE_BACKEND_PORT) yoki Sozlamalar sahifasi
 * orqali boshqa serverga yo'naltirish mumkin.
 */

// Frontend va backend onrender.com da bitta servisda: https://oybek-system.onrender.com
export const DEFAULT_BACKEND_URL = "https://oybek-system.onrender.com";
export const DEFAULT_BACKEND_PORT = 5000;

const STORAGE_URL_KEY = "oybek_system:backend_url_v2";
const STORAGE_PORT_KEY = "oybek_system:backend_port";

/**
 * Backendning to'liq asosiy manzilini olish
 */
export function getBackendBaseUrl() {
  // 1. Agar foydalanuvchi bevosita https://oybek-system.onrender.com da bo'lsa (same-origin):
  if (typeof window !== "undefined" && window.location.origin.includes("oybek-system.onrender.com")) {
    return "";
  }

  // 2. Agar localStorage da maxsus saqlangan manzil bo'lsa
  if (typeof window !== "undefined") {
    const savedUrl = localStorage.getItem(STORAGE_URL_KEY);
    if (savedUrl && typeof savedUrl === "string" && savedUrl.trim()) {
      return savedUrl.trim().replace(/\/+$/, "");
    }
  }

  // 3. Agar .env da VITE_BACKEND_URL bo'lsa
  const envUrl = import.meta.env?.VITE_BACKEND_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    let cleanEnv = envUrl.trim().replace(/\/+$/, "");
    if (!cleanEnv.startsWith("http://") && !cleanEnv.startsWith("https://")) {
      cleanEnv = `https://${cleanEnv}`;
    }
    return cleanEnv;
  }

  // 4. Standart holatda to'g'ridan-to'g'ri Render serveri
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
  DEBTS: "/api/debts",
  DEBT_DETAIL: (id) => `/api/debts/${encodeURIComponent(id)}`,
  DEBT_PAYMENTS: (id) => `/api/debts/${encodeURIComponent(id)}/payments`,
  BACKUP: "/api/backup",
  EXERCISES: "/api/exercises",
  EXERCISE_LOGS: "/api/exercises/logs",
  SNAPSHOT: "/api/snapshot",
  EXCHANGE_RATE_USD: "/api/exchange-rate/usd",
  EXCHANGE_RATE_SYNC_CBU: "/api/exchange-rate/usd/sync-cbu",
  EXCHANGE_RATE_LOG: "/api/exchange-rate/usd/log",
};

// Render (bepul tarif) uxlab qolgan servisni uyg'otishi 30-60s olishi mumkin
export const API_TIMEOUT_MS = 60000;

