/**
 * Multi-User Scoped Storage Helper (OYBEK SysteM)
 * 
 * Har bir foydalanuvchi uchun alohida localStorage kalitlarini shakllantiradi.
 * Masalan:
 * User A ("usr_oybek") -> oybek-system:usr_oybek:expenses
 * User B ("usr_akmal") -> oybek-system:usr_akmal:expenses
 */

export function getCurrentUserId() {
  if (typeof window === "undefined") return "default";
  try {
    const rawUser = localStorage.getItem("oybek_auth_user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      return parsed.userId || parsed.id || parsed.email || parsed.username || "default";
    }
  } catch {}
  return "default";
}

export function getUserStorageKey(baseKey, customUserId) {
  const uid = customUserId || getCurrentUserId();
  if (!uid || uid === "default") {
    return baseKey;
  }
  // Har bir user uchun scoped kalit: "oybek-system:expenses:usr_123"
  return `${baseKey}:${uid}`;
}

/**
 * Foydalanuvchi tizimdan chiqqanda (Logout) barcha xotirani to'liq tozalash.
 * Bir foydalanuvchi ma'lumotlari boshqasiga aralashib ketmasligini 100% kafolatlaydi.
 */
export function clearAllUserData({ preserveBackendConfig = true } = {}) {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        preserveBackendConfig &&
        (key === "oybek_backend_url" ||
          key === "oybek_backend_port" ||
          key === "oybek_system:backend_url_v2" ||
          key === "oybek_system:backend_port")
      ) {
        continue;
      }
      keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    if (window.sessionStorage) {
      window.sessionStorage.clear();
    }
  } catch (e) {
    console.warn("Storage tozalash xatosi:", e);
  }
}
