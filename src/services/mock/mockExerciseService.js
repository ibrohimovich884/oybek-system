import { initialExercises, initialLogs } from './mockData';

const EXERCISES_STORAGE_KEY = 'oybek_exercises_list';
const LOGS_STORAGE_KEY = 'oybek_exercise_logs';

const loadFromStorage = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      return JSON.parse(item);
    }
  } catch (e) {
    console.warn(`LocalStorage read error for ${key}:`, e);
  }
  return fallback;
};

const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`LocalStorage write error for ${key}:`, e);
  }
};

/**
 * Barcha mashqlar ro'yxatini olish
 * @returns {Promise<Array>}
 */
export const getExercises = async () => {
  const exercises = loadFromStorage(EXERCISES_STORAGE_KEY, initialExercises);
  return Promise.resolve([...exercises]);
};

/**
 * Barcha mashq loglarini olish
 * @returns {Promise<Array>}
 */
export const getLogs = async () => {
  const logs = loadFromStorage(LOGS_STORAGE_KEY, initialLogs);
  return Promise.resolve([...logs]);
};

/**
 * Ma'lum sana uchun mashq holatini qayd qilish (bajarildi / bajarilmadi)
 * @param {string} exerciseId
 * @param {string} date - 'YYYY-MM-DD' formati
 * @param {boolean} completed - true/false
 * @param {Object} [details] - ixtiyoriy qo'shimcha ma'lumotlar
 * @returns {Promise<Object>}
 */
export const logExercise = async (exerciseId, date, completed, details = {}) => {
  const logs = loadFromStorage(LOGS_STORAGE_KEY, initialLogs);
  const nowTime = new Date().toTimeString().slice(0, 5); // '09:30'

  const existingIndex = logs.findIndex(
    (l) => l.exerciseId === exerciseId && l.date === date
  );

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
    // Agar checkbox olib tashlansa
    if (existingIndex >= 0) {
      updatedLogs.splice(existingIndex, 1);
    }
    resultLog = { exerciseId, date, completed: false };
  }

  saveToStorage(LOGS_STORAGE_KEY, updatedLogs);
  return Promise.resolve(resultLog);
};

/**
 * Yangi mashq qo'shish
 * @param {Object} newExercise - { name, category, target, durationMinutes, calories, icon }
 * @returns {Promise<Object>}
 */
export const addExercise = async (newExercise) => {
  const exercises = loadFromStorage(EXERCISES_STORAGE_KEY, initialExercises);
  
  const createdExercise = {
    id: `ex_${Date.now()}`,
    name: newExercise.name.trim(),
    category: newExercise.category || 'Umumiy',
    target: newExercise.target || '10 marta',
    durationMinutes: Number(newExercise.durationMinutes) || 15,
    calories: Number(newExercise.calories) || 50,
    icon: newExercise.icon || 'Activity',
    createdAt: new Date().toISOString().split('T')[0],
  };

  const updatedExercises = [...exercises, createdExercise];
  saveToStorage(EXERCISES_STORAGE_KEY, updatedExercises);
  return Promise.resolve(createdExercise);
};

/**
 * Mashqni o'chirish (ixtiyoriy yordamchi funksiya)
 * @param {string} exerciseId
 * @returns {Promise<boolean>}
 */
export const deleteExercise = async (exerciseId) => {
  const exercises = loadFromStorage(EXERCISES_STORAGE_KEY, initialExercises);
  const updatedExercises = exercises.filter((e) => e.id !== exerciseId);
  saveToStorage(EXERCISES_STORAGE_KEY, updatedExercises);

  // Tegishli loglarni ham tozalash
  const logs = loadFromStorage(LOGS_STORAGE_KEY, initialLogs);
  const updatedLogs = logs.filter((l) => l.exerciseId !== exerciseId);
  saveToStorage(LOGS_STORAGE_KEY, updatedLogs);

  return Promise.resolve(true);
};

/**
 * Boshlang'ich mock ma'lumotlarga qaytarish
 */
export const resetToInitialData = async () => {
  saveToStorage(EXERCISES_STORAGE_KEY, initialExercises);
  saveToStorage(LOGS_STORAGE_KEY, initialLogs);
  return Promise.resolve(true);
};
