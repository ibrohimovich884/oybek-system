/**
 * Real Backend API Exercise Service (OYBEK SysteM)
 *
 * Muhim: server bilan yozilmagan (synced:false) mashq va loglar lokalda saqlanib,
 * keyingi o'qishda qayta yuboriladi. Avval server bo'sh ro'yxat qaytarsa (yoki POST
 * xato bersa) lokal mashqlar shunchaki o'chib ketardi.
 */

import { apiClient } from '../../api/client.js';
import { API_ENDPOINTS } from '../../config/apiConfig.js';

const STORAGE_EXERCISES_KEY = 'oybek_exercises_list';
const STORAGE_LOGS_KEY = 'oybek_exercise_logs';
const STORAGE_PENDING_DELETES_KEY = 'oybek_exercises_pending_deletes';

function getLocal(key) {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocal(key, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

const logKey = (l) => `${l.exerciseId}|${l.date}`;

function markExercise(id, patch) {
  setLocal(
    STORAGE_EXERCISES_KEY,
    getLocal(STORAGE_EXERCISES_KEY).map((e) => (e.id === id ? { ...e, ...patch } : e))
  );
}

function markLog(exerciseId, date, patch) {
  setLocal(
    STORAGE_LOGS_KEY,
    getLocal(STORAGE_LOGS_KEY).map((l) =>
      l.exerciseId === exerciseId && l.date === date ? { ...l, ...patch } : l
    )
  );
}

async function retryPendingDeletes() {
  const pending = getLocal(STORAGE_PENDING_DELETES_KEY);
  if (pending.length === 0) return pending;
  const still = [];
  for (const id of pending) {
    const res = await apiClient.delete(`${API_ENDPOINTS.EXERCISES}/${encodeURIComponent(id)}`);
    if (!res.ok) still.push(id);
  }
  setLocal(STORAGE_PENDING_DELETES_KEY, still);
  return still;
}

/**
 * Serverdan mashqlar ro'yxatini olish (yuborilmaganlarni qayta yuboradi)
 */
export const getExercises = async () => {
  const pendingDeletes = await retryPendingDeletes();

  // Avval yuborilmagan lokal mashqlarni serverga urinib ko'ramiz
  for (const ex of getLocal(STORAGE_EXERCISES_KEY).filter((e) => e.synced === false)) {
    const { synced, ...payload } = ex;
    const r = await apiClient.post(API_ENDPOINTS.EXERCISES, payload);
    if (r.ok) markExercise(ex.id, { synced: true });
  }

  const res = await apiClient.get(API_ENDPOINTS.EXERCISES);
  if (res.ok && Array.isArray(res.data)) {
    const unsynced = getLocal(STORAGE_EXERCISES_KEY).filter((e) => e.synced === false);
    const map = new Map();
    res.data
      .filter((e) => !pendingDeletes.includes(e.id))
      .forEach((e) => map.set(e.id, { ...e, synced: true }));
    unsynced.forEach((e) => map.set(e.id, e));
    const merged = Array.from(map.values());
    setLocal(STORAGE_EXERCISES_KEY, merged);
    return merged;
  }
  return getLocal(STORAGE_EXERCISES_KEY);
};

/**
 * Serverdan mashq loglarini olish (yuborilmaganlarni saqlab qoladi)
 */
export const getLogs = async () => {
  for (const log of getLocal(STORAGE_LOGS_KEY).filter((l) => l.synced === false && l.completed)) {
    const { synced, id, ...rest } = log;
    const { exerciseId, date, completed, completedAt, ...details } = rest;
    const r = await apiClient.post(API_ENDPOINTS.EXERCISE_LOGS, { exerciseId, date, completed: true, details });
    if (r.ok) markLog(exerciseId, date, { synced: true });
  }

  const res = await apiClient.get(API_ENDPOINTS.EXERCISE_LOGS);
  if (res.ok && Array.isArray(res.data)) {
    const unsynced = getLocal(STORAGE_LOGS_KEY).filter((l) => l.synced === false);
    const map = new Map();
    res.data.forEach((l) => map.set(logKey(l), { ...l, synced: true }));
    unsynced.forEach((l) => map.set(logKey(l), l));
    const merged = Array.from(map.values());
    setLocal(STORAGE_LOGS_KEY, merged);
    return merged;
  }
  return getLocal(STORAGE_LOGS_KEY);
};

/**
 * Mashq bajarilganligini serverga yuborish
 */
export const logExercise = async (exerciseId, date, completed, details = {}) => {
  const payload = { exerciseId, date, completed, details };

  const logs = getLocal(STORAGE_LOGS_KEY);
  const nowTime = new Date().toTimeString().slice(0, 5);
  const existingIndex = logs.findIndex((l) => l.exerciseId === exerciseId && l.date === date);

  let updatedLogs = [...logs];
  let resultLog;

  if (completed) {
    if (existingIndex >= 0) {
      updatedLogs[existingIndex] = {
        ...updatedLogs[existingIndex],
        completed: true,
        completedAt: updatedLogs[existingIndex].completedAt || nowTime,
        ...details,
        synced: false,
      };
      resultLog = updatedLogs[existingIndex];
    } else {
      resultLog = {
        id: `log_${date}_${exerciseId}`,
        exerciseId,
        date,
        completed: true,
        completedAt: nowTime,
        ...details,
        synced: false,
      };
      updatedLogs.push(resultLog);
    }
  } else {
    if (existingIndex >= 0) {
      updatedLogs.splice(existingIndex, 1);
    }
    resultLog = { exerciseId, date, completed: false };
  }

  setLocal(STORAGE_LOGS_KEY, updatedLogs);

  const res = await apiClient.post(API_ENDPOINTS.EXERCISE_LOGS, payload);
  if (res.ok && res.data) {
    if (completed) markLog(exerciseId, date, { synced: true });
    return res.data;
  }
  console.warn('Mashq logi serverga yozilmadi:', res.error);
  return resultLog;
};

/**
 * Yangi mashq qo'shish
 */
export const addExercise = async (newExercise) => {
  const exercise = {
    id: `ex_${Date.now()}`,
    name: newExercise.name?.trim() || 'Mashq',
    category: newExercise.category || 'Umumiy',
    target: newExercise.target || '10 marta',
    durationMinutes: Number(newExercise.durationMinutes) || 15,
    calories: Number(newExercise.calories) || 50,
    icon: newExercise.icon || 'Activity',
    createdAt: new Date().toISOString().split('T')[0],
  };

  const list = getLocal(STORAGE_EXERCISES_KEY);
  list.push({ ...exercise, synced: false });
  setLocal(STORAGE_EXERCISES_KEY, list);

  const res = await apiClient.post(API_ENDPOINTS.EXERCISES, exercise);
  if (res.ok && res.data) {
    markExercise(exercise.id, { synced: true });
    return res.data;
  }
  console.warn('Mashq serverga yozilmadi:', res.error);
  return exercise;
};

/**
 * Mashqni o'chirish
 */
export const deleteExercise = async (exerciseId) => {
  setLocal(STORAGE_EXERCISES_KEY, getLocal(STORAGE_EXERCISES_KEY).filter((e) => e.id !== exerciseId));
  setLocal(STORAGE_LOGS_KEY, getLocal(STORAGE_LOGS_KEY).filter((l) => l.exerciseId !== exerciseId));

  const res = await apiClient.delete(`${API_ENDPOINTS.EXERCISES}/${encodeURIComponent(exerciseId)}`);
  if (!res.ok) {
    setLocal(STORAGE_PENDING_DELETES_KEY, [...getLocal(STORAGE_PENDING_DELETES_KEY), exerciseId]);
  }
  return true;
};

/**
 * Tozalash
 */
export const resetToInitialData = async () => {
  setLocal(STORAGE_EXERCISES_KEY, []);
  setLocal(STORAGE_LOGS_KEY, []);
  setLocal(STORAGE_PENDING_DELETES_KEY, []);
  return true;
};
