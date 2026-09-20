/**
 * Backend API Konfiguratsiyasi (OYBEK SysteM)
 * 
 * Ushbu faylda faqat backend portini o'zgartirish kifoya.
 * Frontend hech qachon xatolik bilan qulab tushmaydi:
 * - Agar backend ishlab turgan bo'lsa: Real API orqali ma'lumot almashadi.
 * - Agar backend hali ishga tushmagan bo'lsa: Avtomatik ravishda xatosiz lokal (offline)
 *   rejimda ishlaydi va backend yoqilishi bilan unga ulanadi.
 */

// Birlamchi backend porti (shu yerdan yoki .env orqali o'zgartirishingiz mumkin)
export const DEFAULT_BACKEND_PORT = 5000;

const STORAGE_PORT_KEY = "oybek_system:backend_port";

/**
 * Hozirgi sozlangan backend portini olish
 */
export function getBackendPort() {
  // 1. Agar foydalanuvchi UI orqali kiritgan bo'lsa
  const savedPort = typeof window !== "undefined" ? localStorage.getItem(STORAGE_PORT_KEY) : null;
  if (savedPort && !isNaN(Number(savedPort))) {
    return Number(savedPort);
  }

  // 2. Agar .env orqali VITE_BACKEND_PORT berilgan bo'lsa
  const envPort = import.meta.env?.VITE_BACKEND_PORT;
  if (envPort && !isNaN(Number(envPort))) {
    return Number(envPort);
  }

  // 3. Birlamchi port
  return DEFAULT_BACKEND_PORT;
}

/**
 * Backend portini yangilash (UI yoki kod orqali)
 */
export function setBackendPort(port) {
  if (!port || isNaN(Number(port))) return;
  localStorage.setItem(STORAGE_PORT_KEY, String(port));
}

/**
 * Backendning to'liq asosiy manzilini olish
 */
export function getBackendBaseUrl() {
  const customUrl = import.meta.env?.VITE_BACKEND_URL;
  if (customUrl && typeof customUrl === "string" && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, "");
  }
  const port = getBackendPort();
  return `http://localhost:${port}`;
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
};

export const API_TIMEOUT_MS = 3000;
