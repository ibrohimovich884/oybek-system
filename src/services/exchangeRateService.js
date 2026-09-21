/**
 * CBU.uz (O'zbekiston Markaziy banki) Valyuta kurslari xizmati
 * API: https://cbu.uz/uz/arkhiv-kursov-valyut/json/
 * 
 * Imkoniyatlari:
 * - Real vaqtda AQSH Dollari (USD) kursini olish
 * - Internet yo'q bo'lsa yoki API ishlamasa, so'nggi keshdan foydalanish
 * - Foydalanuvchi qo'lda kurs kiritishi uchun fallback rejim
 */

const STORAGE_RATE_KEY = "oybek-system:usd_rate";
const STORAGE_RATE_META_KEY = "oybek-system:usd_rate_meta";
const STORAGE_MANUAL_RATE_KEY = "oybek-system:usd_manual_rate";

const DEFAULT_FALLBACK_RATE = 12850.0;

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

  const manualRaw = localStorage.getItem(STORAGE_MANUAL_RATE_KEY);
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

  const cachedRate = parseFloat(localStorage.getItem(STORAGE_RATE_KEY));
  const metaRaw = localStorage.getItem(STORAGE_RATE_META_KEY);
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

export async function fetchCbuUsdRate() {
  // Agar foydalanuvchi qo'lda kurs belgilagan bo'lsa, uni ustuvor saqlaymiz,
  // lekin fonda CBU kursini ham yangilab keshlab qo'yamiz.
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
      localStorage.setItem(STORAGE_RATE_KEY, String(parsedRate));
      localStorage.setItem(STORAGE_RATE_META_KEY, JSON.stringify(meta));
    }

    const manualRaw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_MANUAL_RATE_KEY) : null;
    const manualRate = manualRaw ? parseFloat(manualRaw) : null;

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
    console.warn("CBU API'dan kurs olishda ogohlantirish (fallback ishlatiladi):", err.message);
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
    localStorage.setItem(STORAGE_MANUAL_RATE_KEY, String(val));
  }
}

export function removeManualRate() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_MANUAL_RATE_KEY);
}
