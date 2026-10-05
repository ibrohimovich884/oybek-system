/**
 * Real Backend API Exercise Service (OYBEK SysteM)
 *
 * Mashqlar (`exercises` jadvali) va mashq jurnali (`exercise_logs` jadvali)
 * to'liq DB va `syncService` sinxronizatsiya navbati bilan integratsiya qilingan.
 */

import { apiClient } from '../../api/client.js';
import { API_ENDPOINTS } from '../../config/apiConfig.js';
import { syncService } from '../syncService.js';
import { getUserStorageKey } from '../../utils/storageKeys.js';

const STORAGE_EXERCISES_KEY = 'oybek_exercises_list';
const STORAGE_LOGS_KEY = 'oybek_exercise_logs';

function getLocal(key) {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(getUserStorageKey(key));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocal(key, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getUserStorageKey(key), JSON.stringify(data));
  } catch {}
}

const logKey = (l) => `${l.exerciseId}|${l.date}`;

export function markExerciseSynced(id, isSynced = true) {
  setLocal(
    STORAGE_EXERCISES_KEY,
    getLocal(STORAGE_EXERCISES_KEY).map((e) => (e.id === id ? { ...e, synced: isSynced } : e))
  );
}

export function markLogSynced(exerciseId, date, isSynced = true) {
  setLocal(
    STORAGE_LOGS_KEY,
    getLocal(STORAGE_LOGS_KEY).map((l) =>
      l.exerciseId === exerciseId && l.date === date ? { ...l, synced: isSynced } : l
    )
  );
}

/**
 * Serverdan mashqlar ro'yxatini olish (DB asosiy manba)
 */
export const getExercises = async () => {
  const localList = getLocal(STORAGE_EXERCISES_KEY);
  const unsyncedLocals = localList.filter((e) => e.synced === false);

  const res = await apiClient.get(API_ENDPOINTS.EXERCISES);
  if (res.ok && Array.isArray(res.data)) {
    const map = new Map();
    res.data.forEach((e) => map.set(e.id, { ...e, synced: true }));
    unsyncedLocals.forEach((e) => map.set(e.id, e));
    const merged = Array.from(map.values());
    setLocal(STORAGE_EXERCISES_KEY, merged);
    return merged;
  }
  return localList;
};

/**
 * Serverdan mashq loglarini olish (DB asosiy manba)
 */
export const getLogs = async () => {
  const localLogs = getLocal(STORAGE_LOGS_KEY);
  const unsyncedLogs = localLogs.filter((l) => l.synced === false);

  const res = await apiClient.get(API_ENDPOINTS.EXERCISE_LOGS);
  if (res.ok && Array.isArray(res.data)) {
    const map = new Map();
    res.data.forEach((l) => map.set(logKey(l), { ...l, synced: true }));
    unsyncedLogs.forEach((l) => map.set(logKey(l), l));
    const merged = Array.from(map.values());
    setLocal(STORAGE_LOGS_KEY, merged);
    return merged;
  }
  return localLogs;
};

/**
 * Mashq bajarilganligini serverga yuborish (DB exercise_logs jadvali)
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

  // 1. Sinxronizatsiya navbatiga olish
  const queueEntry = syncService.addToQueue({
    entity: 'exercise_logs',
    type: 'create',
    targetId: `${exerciseId}_${date}`,
    payload,
  });

  // 2. DBga yuborish
  apiClient.post(API_ENDPOINTS.EXERCISE_LOGS, payload)
    .then((res) => {
      if (res.ok) {
        syncService.removeFromQueue(queueEntry.queueId);
        if (completed) markLogSynced(exerciseId, date, true);
        syncService.addLog('success', `Mashq bajarilishi DBga yozildi (${date})`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('oybek:exercise-synced', { detail: { exerciseId, date } }));
        }
      }
    })
    .catch(() => {});

  return resultLog;
};

/**
 * Yangi mashq qo'shish (DB exercises jadvali)
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

  // 1. Sinxronizatsiya navbatiga olish
  const queueEntry = syncService.addToQueue({
    entity: 'exercises',
    type: 'create',
    targetId: exercise.id,
    payload: exercise,
  });

  // 2. DBga yuborish
  apiClient.post(API_ENDPOINTS.EXERCISES, exercise)
    .then((res) => {
      if (res.ok) {
        markExerciseSynced(exercise.id, true);
        syncService.removeFromQueue(queueEntry.queueId);
        syncService.addLog('success', `Mashq DBga saqlandi: ${exercise.name}`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('oybek:exercise-synced', { detail: { id: exercise.id } }));
        }
      }
    })
    .catch(() => {});

  return exercise;
};

/**
 * Mashqni o'chirish
 */
export const deleteExercise = async (exerciseId) => {
  setLocal(STORAGE_EXERCISES_KEY, getLocal(STORAGE_EXERCISES_KEY).filter((e) => e.id !== exerciseId));
  setLocal(STORAGE_LOGS_KEY, getLocal(STORAGE_LOGS_KEY).filter((l) => l.exerciseId !== exerciseId));

  const queueEntry = syncService.addToQueue({
    entity: 'exercises',
    type: 'delete',
    targetId: exerciseId,
    payload: { id: exerciseId },
  });

  apiClient.delete(`${API_ENDPOINTS.EXERCISES}/${encodeURIComponent(exerciseId)}`)
    .then((res) => {
      if (res.ok) {
        syncService.removeFromQueue(queueEntry.queueId);
        syncService.addLog('success', `Mashq DBdan o'chirildi (ID: ${exerciseId})`);
      }
    })
    .catch(() => {});

  return true;
};

/**
 * Tozalash
 */
export const resetToInitialData = async () => {
  setLocal(STORAGE_EXERCISES_KEY, []);
  setLocal(STORAGE_LOGS_KEY, []);
  return true;
};
