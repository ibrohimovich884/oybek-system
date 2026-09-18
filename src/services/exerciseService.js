// services/exerciseService.js
import * as mockService from './mock/mockExerciseService';
// import * as apiService from './api/apiExerciseService';  // tayyor bo'lganda ochiladi

const service = mockService; // <-- backendga o'tishda faqat shu qatorni almashtirasan: apiService

export const getExercises = service.getExercises;
export const getLogs = service.getLogs;
export const logExercise = service.logExercise;
export const addExercise = service.addExercise;

// Qo'shimcha yordamchi funksiyalar (ixtiyoriy)
export const deleteExercise = service.deleteExercise;
export const resetToInitialData = service.resetToInitialData;
