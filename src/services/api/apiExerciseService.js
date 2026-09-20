/**
 * Real Backend API Exercise Service (OYBEK SysteM)
 * 
 * Ulanish: https://oybek-system-backend-1.onrender.com/api/exercises
 * Backend bilan aloqa bo'lmaganda ham xatosiz ishlaydi.
 */

import { apiClient } from '../../api/client.js';
import { API_ENDPOINTS } from '../../config/apiConfig.js';

const STORAGE_EXERCISES_KEY = 'oybek_exercises_list';
const STORAGE_LOGS_KEY = 'oybek_exercise_logs';

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

/**
 * Serverdan mashqlar ro'yxatini olish
 */
export const getExercises = async () => {
  const res = await apiClient.get(API_ENDPOINTS.EXERCISES);
  if (res.ok && Array.isArray(res.data)) {
    setLocal(STORAGE_EXERCISES_KEY, res.data);
    return res.data;
  }
  return getLocal(STORAGE_EXERCISES_KEY);
};

/**
 * Serverdan mashq loglarini olish
 */
export const getLogs = async () => {
  const res = await apiClient.get(API_ENDPOINTS.EXERCISE_LOGS);
  if (res.ok && Array.isArray(res.data)) {
    setLocal(STORAGE_LOGS_KEY, res.data);
    return res.data;
  }
  return getLocal(STORAGE_LOGS_KEY);
};

/**
 * Mashq bajarilganligini serverga yuborish
 */
export const logExercise = async (exerciseId, date, completed, details = {}) => {
  const payload = { exerciseId, date, completed, details };
  
  // Lokal xotirada tezkor yangilash
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
      };
      resultLog = updatedLogs[existingIndex];
    } else {
      resultLog = {
        id: `log_${date}_${exerciseId}_${Date.now()}`,
        exerciseId,
        date,
        completed: true,
        completedAt: nowTime,
        ...details,
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

  // Backendga yuborish
  const res = await apiClient.post(API_ENDPOINTS.EXERCISE_LOGS, payload);
  if (res.ok && res.data) {
    return res.data;
  }

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
  list.push(exercise);
  setLocal(STORAGE_EXERCISES_KEY, list);

  // Backendga yuborish
  const res = await apiClient.post(API_ENDPOINTS.EXERCISES, exercise);
  if (res.ok && res.data) {
    return res.data;
  }

  return exercise;
};

/**
 * Mashqni o'chirish
 */
export const deleteExercise = async (exerciseId) => {
  const exercises = getLocal(STORAGE_EXERCISES_KEY).filter((e) => e.id !== exerciseId);
  setLocal(STORAGE_EXERCISES_KEY, exercises);

  const logs = getLocal(STORAGE_LOGS_KEY).filter((l) => l.exerciseId !== exerciseId);
  setLocal(STORAGE_LOGS_KEY, logs);

  await apiClient.delete(`${API_ENDPOINTS.EXERCISES}/${encodeURIComponent(exerciseId)}`);
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
