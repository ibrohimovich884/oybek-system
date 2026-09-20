/**
 * Real backend API bilan ishlovchi servis (kelgusida backend tayyor bo'lganda ishlatiladi)
 */

const BASE_URL = '/api';

/**
 * Serverdan mashqlar ro'yxatini olish
 */
export const getExercises = async () => {
  const response = await fetch(`${BASE_URL}/exercises`);
  if (!response.ok) {
    throw new Error(`Mashqlarni yuklab bo'lmadi: ${response.statusText}`);
  }
  return response.json();
};

/**
 * Serverdan mashq loglarini olish
 */
export const getLogs = async () => {
  const response = await fetch(`${BASE_URL}/exercises/logs`);
  if (!response.ok) {
    throw new Error(`Loglarni yuklab bo'lmadi: ${response.statusText}`);
  }
  return response.json();
};

/**
 * Mashq bajarilganligini serverga yuborish
 */
export const logExercise = async (exerciseId, date, completed, details = {}) => {
  const response = await fetch(`${BASE_URL}/exercises/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ exerciseId, date, completed, details }),
  });
  if (!response.ok) {
    throw new Error(`Mashq holatini saqlab bo'lmadi: ${response.statusText}`);
  }
  return response.json();
};

/**
 * Yangi mashq qo'shish
 */
export const addExercise = async (newExercise) => {
  const response = await fetch(`${BASE_URL}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newExercise),
  });
  if (!response.ok) {
    throw new Error(`Yangi mashq qo'shib bo'lmadi: ${response.statusText}`);
  }
  return response.json();
};
