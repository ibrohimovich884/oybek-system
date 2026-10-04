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
  // Agar baseKey "oybek-system:expenses" bo'lsa -> "oybek-system:user_${uid}:expenses"
  return `${baseKey}:${uid}`;
}
