import { apiClient } from "./client.js";
import { getUserStorageKey } from "../utils/storageKeys.js";

const BASE_PEOPLE_KEY = "oybek-system:people";

/**
 * Lokal keshdan odamlarni o'qish
 */
export function readLocalPeople() {
  if (typeof window === "undefined") return [];
  try {
    const storageKey = getUserStorageKey(BASE_PEOPLE_KEY);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Lokal odamlarni o'qishda xatolik:", err);
    return [];
  }
}

/**
 * Lokal keshga odamlarni yozish
 */
export function writeLocalPeople(people) {
  if (typeof window === "undefined") return;
  try {
    const storageKey = getUserStorageKey(BASE_PEOPLE_KEY);
    localStorage.setItem(storageKey, JSON.stringify(people));
  } catch (err) {
    console.warn("Lokal odamlarni yozishda xatolik:", err);
  }
}

/**
 * Lokal odamlardan statistika hisoblash (server mavjud bo'lmaganda yoki oflayn rejimda)
 */
function calculateLocalStats(people = []) {
  const byCategory = {};
  const byCrushStatus = {};
  let active = 0;
  let lostContact = 0;
  let crushes = 0;

  for (const p of people) {
    if (p.status === "active") active++;
    if (p.status === "lost_contact") lostContact++;
    if (p.isCrush) {
      crushes++;
      if (p.crushStatus) {
        byCrushStatus[p.crushStatus] = (byCrushStatus[p.crushStatus] || 0) + 1;
      }
    }
    if (p.category) {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    }
  }

  return {
    total: people.length,
    active,
    lostContact,
    crushes,
    byCategory,
    byCrushStatus,
  };
}

/**
 * Lokal ro'yxatni filtrlash yordamchisi
 */
function filterPeopleList(people = [], params = {}) {
  let result = [...people];

  if (params.category && params.category !== "all") {
    result = result.filter((p) => p.category === params.category);
  }

  if (params.status && params.status !== "all") {
    result = result.filter((p) => p.status === params.status);
  }

  if (params.isCrush !== undefined && params.isCrush !== "") {
    const isCrushVal = params.isCrush === "true" || params.isCrush === true;
    result = result.filter((p) => Boolean(p.isCrush) === isCrushVal);
  }

  if (params.crushStatus && params.crushStatus !== "all") {
    result = result.filter((p) => p.crushStatus === params.crushStatus);
  }

  if (params.search && params.search.trim()) {
    const s = params.search.trim().toLowerCase();
    result = result.filter(
      (p) =>
        (p.nickname && p.nickname.toLowerCase().includes(s)) ||
        (p.fullName && p.fullName.toLowerCase().includes(s)) ||
        (p.phone && p.phone.toLowerCase().includes(s)) ||
        (p.telegram && p.telegram.toLowerCase().includes(s)) ||
        (p.instagram && p.instagram.toLowerCase().includes(s)) ||
        (p.notes && p.notes.toLowerCase().includes(s))
    );
  }

  if (params.sort === "name_desc") {
    result.sort((a, b) => (b.nickname || "").localeCompare(a.nickname || ""));
  } else if (params.sort === "created_desc") {
    result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } else if (params.sort === "met_desc") {
    result.sort((a, b) => new Date(b.metOn || 0) - new Date(a.metOn || 0));
  } else {
    // Standart: name_asc
    result.sort((a, b) => (a.nickname || "").localeCompare(b.nickname || ""));
  }

  return result;
}

/**
 * Barcha odamlar ro'yxatini olish (Server birinchi, lokal zaxira)
 */
export async function fetchPeople(params = {}) {
  const localList = readLocalPeople();

  try {
    const query = new URLSearchParams();
    if (params.category && params.category !== "all") query.set("category", params.category);
    if (params.status && params.status !== "all") query.set("status", params.status);
    if (params.isCrush !== undefined && params.isCrush !== "") query.set("isCrush", params.isCrush);
    if (params.crushStatus && params.crushStatus !== "all") query.set("crushStatus", params.crushStatus);
    if (params.search) query.set("search", params.search);
    if (params.sort) query.set("sort", params.sort);

    const queryString = query.toString();
    const endpoint = `/api/people${queryString ? `?${queryString}` : ""}`;
    const res = await apiClient.get(endpoint);

    if (res.ok && Array.isArray(res.data)) {
      // Server ma'lumotlari bilan lokal keshi yangilaymiz
      const mergedMap = new Map();
      localList.forEach((p) => mergedMap.set(p.id, p));
      res.data.forEach((p) => mergedMap.set(p.id, { ...p, synced: true }));
      const merged = Array.from(mergedMap.values());
      writeLocalPeople(merged);
      return res.data;
    }
  } catch (err) {
    console.warn("Serverdan odamlarni olishda ogohlantirish (lokal xotira ishlatiladi):", err);
  }

  // Server ishlamasa yoki hali deploy qilinmagan bo'lsa, lokal keshdan qaytaramiz
  return filterPeopleList(localList, params);
}

/**
 * Faqat yoqtirganlar ro'yxatini olish
 */
export async function fetchCrushes(params = {}) {
  return fetchPeople({ ...params, isCrush: true });
}

/**
 * Statistika ma'lumotlarini olish
 */
export async function fetchPeopleStats() {
  const localList = readLocalPeople();

  try {
    const res = await apiClient.get("/api/people/stats");
    if (res.ok && res.data) {
      return res.data;
    }
  } catch (err) {
    console.warn("Serverdan statistikani olishda ogohlantirish (lokal hisoblanadi):", err);
  }

  return calculateLocalStats(localList);
}

/**
 * Bitta shaxs kartasini olish
 */
export async function fetchPersonById(id) {
  const localList = readLocalPeople();
  const localFound = localList.find((p) => p.id === id);

  try {
    const res = await apiClient.get(`/api/people/${id}`);
    if (res.ok && res.data) {
      // Lokalda ham yangilab qo'yamiz
      const updated = localList.map((p) => (p.id === id ? res.data : p));
      if (!localFound) updated.push(res.data);
      writeLocalPeople(updated);
      return res.data;
    }
  } catch (err) {
    console.warn(`/api/people/${id} server xatosi:`, err);
  }

  return localFound || null;
}

/**
 * Yangi shaxs qo'shish
 */
export async function createPerson(payload) {
  const localList = readLocalPeople();
  const newId = payload.id || `person_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowStr = new Date().toISOString();

  let initialAppearances = [];
  let latestAppearance = null;

  if (payload.appearance) {
    const appId = `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    latestAppearance = {
      id: appId,
      personId: newId,
      recordedAt: payload.appearance.recordedAt || nowStr.slice(0, 10),
      heightCmEst: payload.appearance.heightCmEst ? Number(payload.appearance.heightCmEst) : null,
      eyeColor: payload.appearance.eyeColor || "",
      hairColor: payload.appearance.hairColor || "",
      faceNotes: payload.appearance.faceNotes || "",
      otherNotes: payload.appearance.otherNotes || "",
      createdAt: nowStr,
    };
    initialAppearances.push(latestAppearance);
  }

  const newPerson = {
    id: newId,
    nickname: payload.nickname?.trim() || "",
    fullName: payload.fullName?.trim() || "",
    gender: payload.gender || "female",
    category: payload.category || "friend",
    status: payload.status || "active",
    isCrush: Boolean(payload.isCrush),
    crushStatus: payload.isCrush ? (payload.crushStatus || "liked") : null,
    crushStartedOn: payload.isCrush ? (payload.crushStartedOn || nowStr.slice(0, 10)) : null,
    metOn: payload.metOn || null,
    metPlace: payload.metPlace?.trim() || "",
    metVia: payload.metVia?.trim() || "",
    birthday: payload.birthday || null,
    phone: payload.phone?.trim() || "",
    telegram: (payload.telegram?.trim() || "").replace(/^@/, ""),
    instagram: (payload.instagram?.trim() || "").replace(/^@/, ""),
    otherContacts: payload.otherContacts?.trim() || "",
    notes: payload.notes?.trim() || "",
    profile: payload.profile || null,
    latestAppearance,
    appearancesCount: initialAppearances.length,
    appearances: initialAppearances,
    createdAt: nowStr,
    updatedAt: nowStr,
    synced: false,
  };

  localList.unshift(newPerson);
  writeLocalPeople(localList);

  // Serverga yuborish
  try {
    const res = await apiClient.post("/api/people", payload);
    if (res.ok && res.data) {
      newPerson.synced = true;
      const updatedList = localList.map((p) => (p.id === newId ? { ...res.data, synced: true } : p));
      writeLocalPeople(updatedList);
      return res.data;
    }
  } catch (err) {
    console.warn("Serverga odam qo'shishda ogohlantirish (lokal saqlandi):", err);
  }

  return newPerson;
}

/**
 * Shaxs kartasini tahrirlash
 */
export async function updatePerson(id, updates) {
  const localList = readLocalPeople();
  const existing = localList.find((p) => p.id === id);

  const updatedPerson = {
    ...(existing || {}),
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
    synced: false,
  };

  const updatedList = localList.map((p) => (p.id === id ? updatedPerson : p));
  writeLocalPeople(updatedList);

  try {
    const res = await apiClient.put(`/api/people/${id}`, updates);
    if (res.ok && res.data) {
      const finalUpdated = updatedList.map((p) => (p.id === id ? { ...res.data, synced: true } : p));
      writeLocalPeople(finalUpdated);
      return res.data;
    }
  } catch (err) {
    console.warn("Serverda odam yangilashda ogohlantirish (lokal saqlandi):", err);
  }

  return updatedPerson;
}

/**
 * Crush statusini tezkor yangilash
 */
export async function updateCrushStatus(id, crushData) {
  const localList = readLocalPeople();
  const existing = localList.find((p) => p.id === id);

  const isCrushVal = Boolean(crushData.isCrush);
  const updatedPerson = {
    ...(existing || {}),
    isCrush: isCrushVal,
    crushStatus: isCrushVal ? (crushData.crushStatus || "liked") : null,
    crushStartedOn: isCrushVal ? (crushData.crushStartedOn || new Date().toISOString().slice(0, 10)) : null,
    updatedAt: new Date().toISOString(),
  };

  const updatedList = localList.map((p) => (p.id === id ? updatedPerson : p));
  writeLocalPeople(updatedList);

  try {
    const res = await apiClient.patch(`/api/people/${id}/crush`, crushData);
    if (res.ok && res.data) {
      return res.data;
    }
  } catch (err) {
    console.warn("Crush statusini serverda yangilashda ogohlantirish:", err);
  }

  return updatedPerson;
}

/**
 * Profilni saqlash / yangilash
 */
export async function updateProfile(id, profileData) {
  const localList = readLocalPeople();
  const existing = localList.find((p) => p.id === id);

  const newProfile = {
    personId: id,
    ...profileData,
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    existing.profile = newProfile;
    existing.updatedAt = new Date().toISOString();
    writeLocalPeople(localList);
  }

  try {
    const res = await apiClient.put(`/api/people/${id}/profile`, profileData);
    if (res.ok && res.data) {
      return res.data;
    }
  } catch (err) {
    console.warn("Profilni serverda yangilashda ogohlantirish:", err);
  }

  return newProfile;
}

/**
 * Tashqi ko'rinish qaydini qo'shish
 */
export async function addAppearance(personId, appearanceData) {
  const localList = readLocalPeople();
  const existing = localList.find((p) => p.id === personId);

  const appId = appearanceData.id || `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowStr = new Date().toISOString();

  const newApp = {
    id: appId,
    personId,
    recordedAt: appearanceData.recordedAt || nowStr.slice(0, 10),
    heightCmEst: appearanceData.heightCmEst ? Number(appearanceData.heightCmEst) : null,
    eyeColor: appearanceData.eyeColor || "",
    hairColor: appearanceData.hairColor || "",
    faceNotes: appearanceData.faceNotes || "",
    otherNotes: appearanceData.otherNotes || "",
    createdAt: nowStr,
  };

  if (existing) {
    if (!Array.isArray(existing.appearances)) existing.appearances = [];
    existing.appearances.unshift(newApp);
    existing.latestAppearance = newApp;
    existing.appearancesCount = existing.appearances.length;
    existing.updatedAt = nowStr;
    writeLocalPeople(localList);
  }

  try {
    const res = await apiClient.post(`/api/people/${personId}/appearances`, appearanceData);
    if (res.ok && res.data) {
      return res.data;
    }
  } catch (err) {
    console.warn("Ko'rinish qaydini serverda qo'shishda ogohlantirish:", err);
  }

  return newApp;
}

/**
 * Tashqi ko'rinish qaydini o'chirish
 */
export async function deleteAppearance(personId, appearanceId) {
  const localList = readLocalPeople();
  const existing = localList.find((p) => p.id === personId);

  if (existing && Array.isArray(existing.appearances)) {
    existing.appearances = existing.appearances.filter((a) => a.id !== appearanceId);
    existing.latestAppearance = existing.appearances[0] || null;
    existing.appearancesCount = existing.appearances.length;
    writeLocalPeople(localList);
  }

  try {
    await apiClient.delete(`/api/people/${personId}/appearances/${appearanceId}`);
  } catch (err) {
    console.warn("Ko'rinish qaydini serverda o'chirishda ogohlantirish:", err);
  }

  return { success: true };
}

/**
 * Shaxsni o'chirish
 */
export async function deletePerson(id) {
  const localList = readLocalPeople();
  const filtered = localList.filter((p) => p.id !== id);
  writeLocalPeople(filtered);

  try {
    await apiClient.delete(`/api/people/${id}`);
  } catch (err) {
    console.warn("Shaxsni serverda o'chirishda ogohlantirish:", err);
  }

  return { success: true };
}
