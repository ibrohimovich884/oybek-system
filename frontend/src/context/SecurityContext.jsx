import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCurrentUserId, getUserStorageKey } from "../utils/storageKeys.js";
import { useAuth } from "./AuthContext.jsx";

const SecurityContext = createContext(null);

const DEFAULT_PIN = "2580";
const BASE_PIN_KEY = "oybek_system_security_pin";
const BASE_CUSTOM_FLAG = "oybek_system_has_custom_pin";
const BASE_CP_LOCK_KEY = "oybek_sec_control_panel_enabled"; // default false (o'chiq)
const BASE_TX_LOCK_KEY = "oybek_sec_transactions_enabled";   // default false (o'chiq)
const BASE_SESSION_UNLOCKED_KEY = "oybek_unlocked_scopes";

export function SecurityProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.userId || user?.id || user?.email || user?.username || getCurrentUserId();

  // 1. Control panelni qulflash holati (DEFAULT: false - o'chiq)
  const [isControlPanelLockEnabled, setIsControlPanelLockEnabledState] = useState(() => {
    try {
      const key = getUserStorageKey(BASE_CP_LOCK_KEY, userId);
      return localStorage.getItem(key) === "true";
    } catch {
      return false;
    }
  });

  // 2. Tranzaksiyalarni va qarzlarni o'chirishni qulflash holati (DEFAULT: false - o'chiq)
  const [isTransactionsLockEnabled, setIsTransactionsLockEnabledState] = useState(() => {
    try {
      const key = getUserStorageKey(BASE_TX_LOCK_KEY, userId);
      return localStorage.getItem(key) === "true";
    } catch {
      return false;
    }
  });

  // 3. Shaxsiy PIN holati (Multi-user localStorage)
  const [pin, setPinState] = useState(() => {
    try {
      const key = getUserStorageKey(BASE_PIN_KEY, userId);
      const saved = localStorage.getItem(key);
      if (saved && saved.length === 4) {
        return saved;
      }
      return DEFAULT_PIN;
    } catch {
      return DEFAULT_PIN;
    }
  });

  const [hasCustomPin, setHasCustomPinState] = useState(() => {
    try {
      const key = getUserStorageKey(BASE_CUSTOM_FLAG, userId);
      return localStorage.getItem(key) === "true";
    } catch {
      return false;
    }
  });

  // 4. Qulflanmagan bo'limlar sessiyasi (sessionStorage)
  const [unlockedScopes, setUnlockedScopes] = useState(() => {
    try {
      const key = getUserStorageKey(BASE_SESSION_UNLOCKED_KEY, userId);
      const saved = sessionStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Foydalanuvchi almashganda yoki tizimga kirganda ma'lumotlarni qayta sinxronlash
  useEffect(() => {
    try {
      const cpKey = getUserStorageKey(BASE_CP_LOCK_KEY, userId);
      setIsControlPanelLockEnabledState(localStorage.getItem(cpKey) === "true");

      const txKey = getUserStorageKey(BASE_TX_LOCK_KEY, userId);
      setIsTransactionsLockEnabledState(localStorage.getItem(txKey) === "true");

      const pinKey = getUserStorageKey(BASE_PIN_KEY, userId);
      const savedPin = localStorage.getItem(pinKey);
      setPinState(savedPin && savedPin.length === 4 ? savedPin : DEFAULT_PIN);

      const customKey = getUserStorageKey(BASE_CUSTOM_FLAG, userId);
      setHasCustomPinState(localStorage.getItem(customKey) === "true");

      const sessKey = getUserStorageKey(BASE_SESSION_UNLOCKED_KEY, userId);
      const savedSess = sessionStorage.getItem(sessKey);
      setUnlockedScopes(savedSess ? JSON.parse(savedSess) : {});
    } catch (e) {
      console.warn("Security state sync xatosi:", e);
    }
  }, [userId]);

  // Sessiyani sinxron saqlash
  const persistScopes = useCallback(
    (newScopes) => {
      setUnlockedScopes(newScopes);
      try {
        const key = getUserStorageKey(BASE_SESSION_UNLOCKED_KEY, userId);
        sessionStorage.setItem(key, JSON.stringify(newScopes));
      } catch (e) {
        console.warn("SessionStorage xatosi:", e);
      }
    },
    [userId]
  );

  // Control panel qulfini yoqish/o'chirish
  const setControlPanelLockEnabled = useCallback(
    (enabled) => {
      const val = Boolean(enabled);
      setIsControlPanelLockEnabledState(val);
      try {
        const key = getUserStorageKey(BASE_CP_LOCK_KEY, userId);
        localStorage.setItem(key, String(val));
      } catch (e) {
        console.warn("CP lock saqlashda xato:", e);
      }
    },
    [userId]
  );

  // Tranzaksiyalar qulfini yoqish/o'chirish
  const setTransactionsLockEnabled = useCallback(
    (enabled) => {
      const val = Boolean(enabled);
      setIsTransactionsLockEnabledState(val);
      try {
        const key = getUserStorageKey(BASE_TX_LOCK_KEY, userId);
        localStorage.setItem(key, String(val));
      } catch (e) {
        console.warn("TX lock saqlashda xato:", e);
      }
    },
    [userId]
  );

  // Parolni tekshirish (Universal)
  const verifyPin = useCallback(
    (inputPin) => {
      if (!inputPin) return false;
      return String(inputPin).trim() === String(pin).trim();
    },
    [pin]
  );

  // Yangi PIN kodni to'g'ridan-to'g'ri o'rnatish (birinchi marta o'rnatayotganda)
  const setPinDirectly = useCallback(
    (newPin) => {
      const cleanNewPin = String(newPin || "").trim();

      if (!/^\d{4}$/.test(cleanNewPin)) {
        return {
          success: false,
          message: "PIN parol roppa-rosa 4 ta raqamdan iborat bo'lishi kerak!",
        };
      }

      try {
        const pinKey = getUserStorageKey(BASE_PIN_KEY, userId);
        const flagKey = getUserStorageKey(BASE_CUSTOM_FLAG, userId);
        localStorage.setItem(pinKey, cleanNewPin);
        localStorage.setItem(flagKey, "true");
        setPinState(cleanNewPin);
        setHasCustomPinState(true);
        return {
          success: true,
          message: "Yangi maxfiy PIN muvaffaqiyatli saqlandi!",
        };
      } catch (err) {
        return {
          success: false,
          message: "Parolni saqlashda xatolik yuz berdi: " + err.message,
        };
      }
    },
    [userId]
  );

  // Parolni o'zgartirish (Joriy parol tekshiruvi bilan)
  const changePin = useCallback(
    (currentPin, newPin) => {
      if (hasCustomPin && !verifyPin(currentPin)) {
        return {
          success: false,
          message: "Joriy parol noto'g'ri kiritildi!",
        };
      }

      return setPinDirectly(newPin);
    },
    [hasCustomPin, verifyPin, setPinDirectly]
  );

  // Parolni standart holatga tiklash (2580)
  const resetPinToDefault = useCallback(() => {
    try {
      const pinKey = getUserStorageKey(BASE_PIN_KEY, userId);
      const flagKey = getUserStorageKey(BASE_CUSTOM_FLAG, userId);
      localStorage.setItem(pinKey, DEFAULT_PIN);
      localStorage.setItem(flagKey, "false");
      setPinState(DEFAULT_PIN);
      setHasCustomPinState(false);
      return {
        success: true,
        message: "Parol standart holatga (2580) qaytarildi.",
      };
    } catch (err) {
      return {
        success: false,
        message: "Xatolik: " + err.message,
      };
    }
  }, [userId]);

  // Muayyan bo'lim qulfdan ochilganligini tekshirish
  const isUnlocked = useCallback(
    (scope) => {
      if (!scope) return false;
      // Agar control panel qulflash o'chiq bo'lsa, u doim ochiq hisoblanadi
      if (scope === "control_panel" && !isControlPanelLockEnabled) {
        return true;
      }
      // Agar tranzaksiyalar qulflash o'chiq bo'lsa, u doim ochiq hisoblanadi
      if (scope === "transactions" && !isTransactionsLockEnabled) {
        return true;
      }
      // Sozlamalar ham ochiq bo'lishi kerak
      if (scope === "settings_security") {
        return true;
      }
      return Boolean(unlockedScopes[scope]);
    },
    [isControlPanelLockEnabled, isTransactionsLockEnabled, unlockedScopes]
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
    [unlockedScopes, persistScopes]
  );

  // Muayyan bo'limni qulflash
  const lockScope = useCallback(
    (scope) => {
      if (!scope) return;
      const updated = { ...unlockedScopes };
      delete updated[scope];
      persistScopes(updated);
    },
    [unlockedScopes, persistScopes]
  );

  // Barcha bo'limlarni zudlik bilan qulflash
  const lockAll = useCallback(() => {
    persistScopes({});
  }, [persistScopes]);

  const value = {
    userId,
    pin,
    defaultPin: DEFAULT_PIN,
    hasCustomPin,
    isControlPanelLockEnabled,
    setControlPanelLockEnabled,
    isTransactionsLockEnabled,
    setTransactionsLockEnabled,
    verifyPin,
    setPinDirectly,
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

