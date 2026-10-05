/**
 * CBU.uz (O'zbekiston Markaziy banki) Valyuta kurslari xizmati
 * 
 * DB `cbu_rate_log` jadvali bilan to'liq integratsiya qilingan:
 * 1. Kurs so'ralganda birinchi navbatda backend orqali CBU'dan yangilab DBga yozadi (/api/exchange-rate/usd/sync-cbu).
 * 2. Backend oflayn bo'lsa, to'g'ridan-to'g'ri CBU.uz dan olib keshlaydi va DBga yuborish uchun navbatga qo'yadi.
 * 3. Qo'lda kiritilgan kurs yoki avvalgi kesh fallback sifatida ishlatiladi.
 */

import { apiClient } from "../api/client.js";
import { API_ENDPOINTS } from "../config/apiConfig.js";
import { syncService } from "./syncService.js";
import { getUserStorageKey } from "../utils/storageKeys.js";

const STORAGE_RATE_KEY = "oybek-system:usd_rate";
const STORAGE_RATE_META_KEY = "oybek-system:usd_rate_meta";
const STORAGE_MANUAL_RATE_KEY = "oybek-system:usd_manual_rate";
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 soat (1 kun)

const DEFAULT_FALLBACK_RATE = 12850.0;

/**
 * CBU kursi bugun yangilanganmi yoki 24 soat ichidami tekshirish (1 kunda 1 marta)
 */
export function isCbuRateFresh() {
  if (typeof window === "undefined") return false;
  try {
    const metaRaw = localStorage.getItem(getUserStorageKey(STORAGE_RATE_META_KEY)) || localStorage.getItem(STORAGE_RATE_META_KEY);
    const cachedRate = parseFloat(localStorage.getItem(getUserStorageKey(STORAGE_RATE_KEY)) || localStorage.getItem(STORAGE_RATE_KEY));
    if (!cachedRate || isNaN(cachedRate) || cachedRate <= 0) return false;
    if (!metaRaw) return false;
    const meta = JSON.parse(metaRaw);
    if (!meta.lastSuccess) return false;

    const lastDate = new Date(meta.lastSuccess);
    const now = new Date();
    // Agar xuddi shu kalendar kunda olingan bo'lsa yoki 24 soat ichida bo'lsa
    const isSameDay = lastDate.getFullYear() === now.getFullYear() &&
                      lastDate.getMonth() === now.getMonth() &&
                      lastDate.getDate() === now.getDate();

    const diffMs = now.getTime() - lastDate.getTime();
    return isSameDay || diffMs < ONE_DAY_MS;
  } catch {
    return false;
  }
}

export function getStoredRateData() {
  if (typeof window === "undefined") {
    return {
      rate: DEFAULT_FALLBACK_RATE,
      date: new Date().toLocaleDateString("uz-UZ"),
      diff: "0.00",
      isManual: false,
      isOnline: false,
      source: "standart",
    };
  }

  const manualRaw = localStorage.getItem(getUserStorageKey(STORAGE_MANUAL_RATE_KEY)) || localStorage.getItem(STORAGE_MANUAL_RATE_KEY);
  if (manualRaw) {
    const manualRate = parseFloat(manualRaw);
    if (!isNaN(manualRate) && manualRate > 0) {
      return {
        rate: manualRate,
        date: new Date().toLocaleDateString("uz-UZ"),
        diff: "0.00",
        isManual: true,
        isOnline: false,
        source: "qo'lda kiritilgan",
      };
    }
  }

  const cachedRate = parseFloat(localStorage.getItem(getUserStorageKey(STORAGE_RATE_KEY)) || localStorage.getItem(STORAGE_RATE_KEY));
  const metaRaw = localStorage.getItem(getUserStorageKey(STORAGE_RATE_META_KEY)) || localStorage.getItem(STORAGE_RATE_META_KEY);
  let meta = {};
  try {
    meta = metaRaw ? JSON.parse(metaRaw) : {};
  } catch {
    meta = {};
  }

  return {
    rate: !isNaN(cachedRate) && cachedRate > 0 ? cachedRate : DEFAULT_FALLBACK_RATE,
    date: meta.date || new Date().toLocaleDateString("uz-UZ"),
    diff: meta.diff || "0.00",
    isManual: false,
    isOnline: !!meta.lastSuccess,
    source: meta.lastSuccess ? "CBU.uz (kesh)" : "standart",
  };
}

export async function fetchCbuUsdRate(force = false) {
  const manualRaw = typeof window !== "undefined"
    ? (localStorage.getItem(getUserStorageKey(STORAGE_MANUAL_RATE_KEY)) || localStorage.getItem(STORAGE_MANUAL_RATE_KEY))
    : null;
  const manualRate = manualRaw ? parseFloat(manualRaw) : null;

  // 1. Agar majburiy (force) bo'lmasa va 1 kun ichida olingan bo'lsa, ortiqcha so'rov jo'natmaymiz
  if (!force && isCbuRateFresh()) {
    const stored = getStoredRateData();
    return stored;
  }

  // 2. Birinchi navbatda backend orqali DB `cbu_rate_log` ga yozish va olishga urinamiz
  try {
    const serverRes = await apiClient.post(API_ENDPOINTS.EXCHANGE_RATE_SYNC_CBU, {});
    if (serverRes.ok && serverRes.data && serverRes.data.rate) {
      const parsedRate = Number(serverRes.data.rate);
      const meta = {
        date: new Date().toLocaleDateString("uz-UZ"),
        diff: "0.00",
        lastSuccess: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        localStorage.setItem(getUserStorageKey(STORAGE_RATE_KEY), String(parsedRate));
        localStorage.setItem(getUserStorageKey(STORAGE_RATE_META_KEY), JSON.stringify(meta));
        localStorage.setItem(STORAGE_RATE_KEY, String(parsedRate));
        localStorage.setItem(STORAGE_RATE_META_KEY, JSON.stringify(meta));
      }

      if (manualRate && !isNaN(manualRate) && manualRate > 0) {
        return {
          rate: manualRate,
          cbuRate: parsedRate,
          date: meta.date,
          diff: meta.diff,
          isManual: true,
          isOnline: true,
          source: "qo'lda kiritilgan (DB CBU mavjud)",
        };
      }

      return {
        rate: parsedRate,
        cbuRate: parsedRate,
        date: meta.date,
        diff: meta.diff,
        isManual: false,
        isOnline: true,
        source: "CBU.uz (DB loglandi)",
      };
    }
  } catch (backendErr) {
    console.warn("Backend orqali CBU log qilish kechikdi, to'g'ridan-to'g'ri CBU tekshiriladi:", backendErr.message);
  }

  // 3. Agar backend javob bermasa, brauzerdan to'g'ridan-to'g'ri CBU API ga murojaat
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch("https://cbu.uz/uz/arkhiv-kursov-valyut/json/", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`CBU API server javobi: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("CBU API ma'lumotlari kutilgan massiv formatida emas");
    }

    const usdItem = data.find((item) => item.Ccy === "USD");
    if (!usdItem || !usdItem.Rate) {
      throw new Error("USD kursi topilmadi");
    }

    const parsedRate = parseFloat(usdItem.Rate);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      throw new Error("Noto'g'ri kurs qiymati");
    }

    const meta = {
      date: usdItem.Date,
      diff: usdItem.Diff,
      lastSuccess: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(getUserStorageKey(STORAGE_RATE_KEY), String(parsedRate));
      localStorage.setItem(getUserStorageKey(STORAGE_RATE_META_KEY), JSON.stringify(meta));
      localStorage.setItem(STORAGE_RATE_KEY, String(parsedRate));
      localStorage.setItem(STORAGE_RATE_META_KEY, JSON.stringify(meta));
    }

    // DBga log qilish uchun navbatga olamiz va backendga urinib ko'ramiz
    const queueEntry = syncService.addToQueue({
      entity: "exchange_rate",
      type: "create",
      targetId: "cbu_usd",
      payload: { rate: parsedRate },
    });

    apiClient.post(API_ENDPOINTS.EXCHANGE_RATE_LOG, { rate: parsedRate })
      .then((res) => {
        if (res.ok) {
          syncService.removeFromQueue(queueEntry.queueId);
          syncService.addLog("success", `Dollar kursi cbu_rate_log DBga yozildi (${parsedRate})`);
        }
      })
      .catch(() => {});

    if (manualRate && !isNaN(manualRate) && manualRate > 0) {
      return {
        rate: manualRate,
        cbuRate: parsedRate,
        date: usdItem.Date,
        diff: usdItem.Diff,
        isManual: true,
        isOnline: true,
        source: "qo'lda kiritilgan (CBU mavjud)",
      };
    }

    return {
      rate: parsedRate,
      cbuRate: parsedRate,
      date: usdItem.Date,
      diff: usdItem.Diff,
      isManual: false,
      isOnline: true,
      source: "CBU.uz",
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("CBU API'dan kurs olishda ogohlantirish (kesh ishlatiladi):", err.message);
    const stored = getStoredRateData();
    return {
      ...stored,
      isOnline: false,
      error: err.message,
    };
  }
}

export function saveManualRate(newRate) {
  if (typeof window === "undefined") return;
  const val = parseFloat(newRate);
  if (!isNaN(val) && val > 0) {
    localStorage.setItem(getUserStorageKey(STORAGE_MANUAL_RATE_KEY), String(val));
    localStorage.setItem(STORAGE_MANUAL_RATE_KEY, String(val));
  }
}

export function removeManualRate() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getUserStorageKey(STORAGE_MANUAL_RATE_KEY));
  localStorage.removeItem(STORAGE_MANUAL_RATE_KEY);
}
