import { createContext, useContext, useState, useEffect, useCallback } from "react";

const SecurityContext = createContext(null);

const DEFAULT_PIN = "2580";
const STORAGE_PIN_KEY = "oybek_system_security_pin";
const STORAGE_CUSTOM_FLAG = "oybek_system_has_custom_pin";
const SESSION_UNLOCKED_KEY = "oybek_unlocked_scopes";

export function SecurityProvider({ children }) {
  // 1. PIN holati (Lokal xotirada saqlanadi)
  const [pin, setPin] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PIN_KEY);
      if (saved && saved.length === 4) {
        // Agar eski standart "1234" qolgan bo'lsa va custom qilinmagan bo'lsa, yangi standart 2580 ga o'tkazish
        const isCustom = localStorage.getItem(STORAGE_CUSTOM_FLAG) === "true";
        if (saved === "1234" && !isCustom) {
          localStorage.setItem(STORAGE_PIN_KEY, DEFAULT_PIN);
          return DEFAULT_PIN;
        }
        return saved;
      }
      return DEFAULT_PIN;
    } catch {
      return DEFAULT_PIN;
    }
  });

  const [hasCustomPin, setHasCustomPin] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_CUSTOM_FLAG) === "true";
    } catch {
      return false;
    }
  });

  // 2. Qulflanmagan bo'limlar sessiyasi (sessionStorage)
  const [unlockedScopes, setUnlockedScopes] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_UNLOCKED_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sessiyani sinxron saqlash
  const persistScopes = (newScopes) => {
    setUnlockedScopes(newScopes);
    try {
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, JSON.stringify(newScopes));
    } catch (e) {
      console.warn("SessionStorage xatosi:", e);
    }
  };

  // Parolni tekshirish (Universal)
  const verifyPin = useCallback(
    (inputPin) => {
      if (!inputPin) return false;
      return String(inputPin).trim() === String(pin).trim();
    },
    [pin]
  );

  // Parolni o'zgartirish (Edit PIN)
  const changePin = useCallback(
    (currentPin, newPin) => {
      if (!verifyPin(currentPin)) {
        return {
          success: false,
          message: "Joriy parol noto'g'ri kiritildi!",
        };
      }

      const cleanNewPin = String(newPin || "").trim();

      // Hozircha 4 ta belgili tekshiruv (kelajakda kengaytiriladi)
      if (!/^\d{4}$/.test(cleanNewPin)) {
        return {
          success: false,
          message: "Yangi parol roppa-rosa 4 ta raqamdan iborat bo'lishi kerak!",
        };
      }

      try {
        localStorage.setItem(STORAGE_PIN_KEY, cleanNewPin);
        localStorage.setItem(STORAGE_CUSTOM_FLAG, "true");
        setPin(cleanNewPin);
        setHasCustomPin(true);
        return {
          success: true,
          message: "Yangi maxfiy parol muvaffaqiyatli saqlandi!",
        };
      } catch (err) {
        return {
          success: false,
          message: "Parolni saqlashda xatolik yuz berdi: " + err.message,
        };
      }
    },
    [verifyPin]
  );

  // Parolni standart holatga tiklash
  const resetPinToDefault = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_PIN_KEY, DEFAULT_PIN);
      localStorage.setItem(STORAGE_CUSTOM_FLAG, "false");
      setPin(DEFAULT_PIN);
      setHasCustomPin(false);
      return {
        success: true,
        message: "Parol standart holatga qaytarildi.",
      };
    } catch (err) {
      return {
        success: false,
        message: "Xatolik: " + err.message,
      };
    }
  }, []);

  // Muayyan bo'lim qulfdan ochilganligini tekshirish
  const isUnlocked = useCallback(
    (scope) => {
      if (!scope) return false;
      return Boolean(unlockedScopes[scope]);
    },
    [unlockedScopes]
  );

  // Muayyan bo'limni ochish
  const unlockScope = useCallback(
    (scope) => {
      if (!scope) return;
      persistScopes({
        ...unlockedScopes,
        [scope]: true,
      });
    },
    [unlockedScopes]
  );

  // Muayyan bo'limni qulflash
  const lockScope = useCallback(
    (scope) => {
      if (!scope) return;
      const updated = { ...unlockedScopes };
      delete updated[scope];
      persistScopes(updated);
    },
    [unlockedScopes]
  );

  // Barcha bo'limlarni zudlik bilan qulflash
  const lockAll = useCallback(() => {
    persistScopes({});
  }, []);

  const value = {
    pin,
    defaultPin: DEFAULT_PIN,
    hasCustomPin,
    verifyPin,
    changePin,
    resetPinToDefault,
    isUnlocked,
    unlockScope,
    lockScope,
    lockAll,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error("useSecurity faqat SecurityProvider ichida ishlatilishi kerak!");
  }
  return context;
}
