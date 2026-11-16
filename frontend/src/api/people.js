import { apiClient } from "./client.js";
import { getUserStorageKey } from "../utils/storageKeys.js";
import { syncService } from "../services/syncService.js";
import { readLocalDebts, writeLocalDebts } from "./debts.js";

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
    return Array.isArray(parsed)
      ? parsed.map((p) => ({ ...p, synced: p.synced !== undefined ? Boolean(p.synced) : true }))
      : [];
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

export function markPersonSynced(personId, isSynced = true) {
  const list = readLocalPeople();
  const updated = list.map((p) => (p.id === personId ? { ...p, synced: isSynced } : p));
  writeLocalPeople(updated);
}

/**
 * Lokal odamlardan statistika hisoblash (server mavjud bo'lmaganda yoki oflayn rejimda)
 */
function calculateLocalStats(people = []) {
  const byCategory = {};
  const byCrushStatus = {};
  const byTrustLevel = { high: 0, medium: 0, low: 0 };
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
    const trust = p.trustLevel || "medium";
    byTrustLevel[trust] = (byTrustLevel[trust] || 0) + 1;
  }

  return {
    total: people.length,
    active,
    lostContact,
    crushes,
    byCategory,
    byCrushStatus,
    byTrustLevel,
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

  if (params.trustLevel && params.trustLevel !== "all") {
    result = result.filter((p) => (p.trustLevel || "medium") === params.trustLevel);
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
    const sClean = s.replace(/^@/, "");
    result = result.filter(
      (p) =>
        (p.nickname && p.nickname.toLowerCase().includes(s)) ||
        (p.fullName && p.fullName.toLowerCase().includes(s)) ||
        (p.phone && p.phone.toLowerCase().includes(s)) ||
        (p.telegram && p.telegram.toLowerCase().includes(sClean)) ||
        (p.instagram && p.instagram.toLowerCase().includes(sClean)) ||
        (p.otherContacts && p.otherContacts.toLowerCase().includes(s)) ||
        (p.metPlace && p.metPlace.toLowerCase().includes(s)) ||
        (p.profile?.area && p.profile.area.toLowerCase().includes(s)) ||
        (p.notes && p.notes.toLowerCase().includes(s))
    );
  }

  if (params.sort === "name_desc") {
    result.sort((a, b) => (b.nickname || "").localeCompare(a.nickname || ""));
  } else if (params.sort === "created_desc") {
    result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } else if (params.sort === "met_desc") {
    result.sort((a, b) => new Date(b.metOn || 0) - new Date(a.metOn || 0));
  } else if (params.sort === "trust_desc") {
    const order = { high: 1, medium: 2, low: 3 };
    result.sort(
      (a, b) =>
        (order[a.trustLevel || "medium"] || 2) - (order[b.trustLevel || "medium"] || 2) ||
        (a.nickname || "").localeCompare(b.nickname || "")
    );
  } else {
    result.sort((a, b) => (a.nickname || "").localeCompare(b.nickname || ""));
  }

  return result;
}

/**
 * Barcha odamlar ro'yxatini olish (Server birinchi, lokal zaxira)
 */
export async function fetchPeople(params = {}) {
  const localList = readLocalPeople();
  const isUnfiltered =
    (!params.category || params.category === "all") &&
    (!params.status || params.status === "all") &&
    (!params.trustLevel || params.trustLevel === "all") &&
    (params.isCrush === undefined || params.isCrush === "") &&
    (!params.crushStatus || params.crushStatus === "all") &&
    (!params.search || !params.search.trim());

  try {
    const query = new URLSearchParams();
    if (params.category && params.category !== "all") query.set("category", params.category);
    if (params.status && params.status !== "all") query.set("status", params.status);
    if (params.trustLevel && params.trustLevel !== "all") query.set("trustLevel", params.trustLevel);
    if (params.isCrush !== undefined && params.isCrush !== "") query.set("isCrush", params.isCrush);
    if (params.crushStatus && params.crushStatus !== "all") query.set("crushStatus", params.crushStatus);
    if (params.search) query.set("search", params.search);
    if (params.sort) query.set("sort", params.sort);

    const queryString = query.toString();
    const endpoint = `/api/people${queryString ? `?${queryString}` : ""}`;
    const res = await apiClient.get(endpoint);

    if (res.ok && Array.isArray(res.data)) {
      const unsyncedLocals = localList.filter((p) => p.synced === false);
      if (isUnfiltered) {
        const mergedMap = new Map();
        res.data.forEach((p) => mergedMap.set(p.id, { ...p, synced: true }));
        unsyncedLocals.forEach((p) => mergedMap.set(p.id, p));
        const merged = Array.from(mergedMap.values());
        writeLocalPeople(merged);
        return filterPeopleList(merged, params);
      } else {
        const mergedMap = new Map();
        localList.forEach((p) => mergedMap.set(p.id, p));
        res.data.forEach((p) => mergedMap.set(p.id, { ...p, synced: true }));
        unsyncedLocals.forEach((p) => mergedMap.set(p.id, p));
        writeLocalPeople(Array.from(mergedMap.values()));
        return res.data;
      }
    }
  } catch (err) {
    console.warn("Serverdan odamlarni olishda ogohlantirish (lokal xotira ishlatiladi):", err);
  }

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
    const res = await apiClient.get(`/api/people/${encodeURIComponent(id)}`);
    if (res.ok && res.data) {
      const syncedPerson = { ...res.data, synced: true };
      const updated = localList.map((p) => (p.id === id ? syncedPerson : p));
      if (!localFound) updated.push(syncedPerson);
      writeLocalPeople(updated);
      return syncedPerson;
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
    const appId = payload.appearance.id || `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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

  const serverPayload = {
    ...payload,
    id: newId,
    appearance: latestAppearance ? { ...payload.appearance, id: latestAppearance.id } : undefined,
  };

  const newPerson = {
    id: newId,
    nickname: payload.nickname?.trim() || "",
    fullName: payload.fullName?.trim() || "",
    gender: payload.gender || null,
    category: payload.category || "acquaintance",
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
    trustLevel: payload.trustLevel || "medium",
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

  const queueEntry = syncService.addToQueue({
    entity: "people",
    type: "create",
    targetId: newId,
    payload: serverPayload,
  });

  try {
    const res = await apiClient.post("/api/people", serverPayload);
    if (res.ok && res.data) {
      const syncedPerson = { ...res.data, synced: true };
      const updatedList = readLocalPeople().map((p) => (p.id === newId ? syncedPerson : p));
      writeLocalPeople(updatedList);
      syncService.removeFromQueue(queueEntry.queueId);
      syncService.addLog("success", `Shaxs DBga saqlandi: ${syncedPerson.nickname}`);
      return syncedPerson;
    }
  } catch (err) {
    console.warn("Serverga odam qo'shishda ogohlantirish (oflayn navbatga olindi):", err);
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
    telegram: updates.telegram !== undefined ? String(updates.telegram || "").trim().replace(/^@/, "") : (existing?.telegram || ""),
    instagram: updates.instagram !== undefined ? String(updates.instagram || "").trim().replace(/^@/, "") : (existing?.instagram || ""),
    updatedAt: new Date().toISOString(),
    synced: false,
  };

  const updatedList = localList.some((p) => p.id === id)
    ? localList.map((p) => (p.id === id ? updatedPerson : p))
    : [updatedPerson, ...localList];
  writeLocalPeople(updatedList);

  // Lokal qarzlardagi bog'langan personName/contact ham yangilansin
  try {
    const debts = readLocalDebts();
    let changed = false;
    const nextDebts = debts.map((d) => {
      if (d.personId !== id) return d;
      changed = true;
      return {
        ...d,
        personName: updatedPerson.nickname || d.personName,
        contact: (!d.contact || d.contact === existing?.phone) ? (updatedPerson.phone || "") : d.contact,
        telegram: (!d.telegram || d.telegram === existing?.telegram) ? (updatedPerson.telegram || "") : d.telegram,
        instagram: (!d.instagram || d.instagram === existing?.instagram) ? (updatedPerson.instagram || "") : d.instagram,
        linkedPerson: {
          ...(d.linkedPerson || {}),
          id,
          nickname: updatedPerson.nickname || "",
          fullName: updatedPerson.fullName || "",
          trustLevel: updatedPerson.trustLevel || "medium",
          phone: updatedPerson.phone || "",
          telegram: updatedPerson.telegram || "",
          instagram: updatedPerson.instagram || "",
        },
      };
    });
    if (changed) {
      writeLocalDebts(nextDebts);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oybek:debts-local-updated"));
      }
    }
  } catch {}

  const queueEntry = syncService.addToQueue({
    entity: "people",
    type: "update",
    targetId: id,
    payload: updates,
  });

  try {
    const res = await apiClient.put(`/api/people/${encodeURIComponent(id)}`, updates);
    if (res.ok && res.data) {
      const syncedPerson = { ...res.data, synced: true };
      const finalUpdated = readLocalPeople().map((p) => (p.id === id ? syncedPerson : p));
      writeLocalPeople(finalUpdated);
      syncService.removeFromQueue(queueEntry.queueId);
      syncService.addLog("success", `Shaxs yangilanishi DBga saqlandi: ${syncedPerson.nickname}`);
      return syncedPerson;
    }
  } catch (err) {
    console.warn("Serverda odam yangilashda ogohlantirish (oflayn navbatga olindi):", err);
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
    synced: false,
  };

  const updatedList = localList.map((p) => (p.id === id ? updatedPerson : p));
  writeLocalPeople(updatedList);

  const queueEntry = syncService.addToQueue({
    entity: "people",
    type: "crush",
    targetId: id,
    payload: crushData,
  });

  try {
    const res = await apiClient.patch(`/api/people/${encodeURIComponent(id)}/crush`, crushData);
    if (res.ok && res.data) {
      const syncedPerson = { ...res.data, synced: true };
      writeLocalPeople(readLocalPeople().map((p) => (p.id === id ? syncedPerson : p)));
      syncService.removeFromQueue(queueEntry.queueId);
      return syncedPerson;
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
    existing.synced = false;
    writeLocalPeople(localList);
  }

  const queueEntry = syncService.addToQueue({
    entity: "person_profile",
    type: "update",
    targetId: id,
    payload: profileData,
  });

  try {
    const res = await apiClient.put(`/api/people/${encodeURIComponent(id)}/profile`, profileData);
    if (res.ok && res.data) {
      const nextList = readLocalPeople().map((p) =>
        p.id === id ? { ...p, profile: res.data, synced: true } : p
      );
      writeLocalPeople(nextList);
      syncService.removeFromQueue(queueEntry.queueId);
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
  const payloadWithId = { ...appearanceData, id: appId };

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
    existing.synced = false;
    writeLocalPeople(localList);
  }

  const queueEntry = syncService.addToQueue({
    entity: "person_appearances",
    type: "create",
    targetId: personId,
    payload: payloadWithId,
  });

  try {
    const res = await apiClient.post(`/api/people/${encodeURIComponent(personId)}/appearances`, payloadWithId);
    if (res.ok && res.data) {
      const nextList = readLocalPeople().map((p) => {
        if (p.id !== personId) return p;
        const nextApps = (p.appearances || []).map((a) => (a.id === appId ? res.data : a));
        return {
          ...p,
          appearances: nextApps,
          latestAppearance: nextApps[0] || res.data,
          synced: true,
        };
      });
      writeLocalPeople(nextList);
      syncService.removeFromQueue(queueEntry.queueId);
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

  const queueEntry = syncService.addToQueue({
    entity: "person_appearances",
    type: "delete",
    targetId: personId,
    payload: { appearanceId },
  });

  try {
    const res = await apiClient.delete(`/api/people/${encodeURIComponent(personId)}/appearances/${encodeURIComponent(appearanceId)}`);
    if (res && res.ok) {
      syncService.removeFromQueue(queueEntry.queueId);
    }
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

  // Lokal qarzlardagi dangling personId ni tozalash
  try {
    const localDebts = readLocalDebts();
    let debtsChanged = false;
    const cleanedDebts = localDebts.map((d) => {
      if (d.personId === id || d.linkedPerson?.id === id) {
        debtsChanged = true;
        return { ...d, personId: null, linkedPerson: null };
      }
      return d;
    });
    if (debtsChanged) {
      writeLocalDebts(cleanedDebts);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oybek:debts-local-updated"));
      }
    }
  } catch {}

  const queueEntry = syncService.addToQueue({
    entity: "people",
    type: "delete",
    targetId: id,
    payload: { id },
  });

  try {
    const res = await apiClient.delete(`/api/people/${encodeURIComponent(id)}`);
    if (res && res.ok) {
      syncService.removeFromQueue(queueEntry.queueId);
      syncService.addLog("success", `Shaxs DBdan o'chirildi (ID: ${id})`);
    }
  } catch (err) {
    console.warn("Shaxsni serverda o'chirishda ogohlantirish (navbatga olindi):", err);
  }

  return { success: true };
}
