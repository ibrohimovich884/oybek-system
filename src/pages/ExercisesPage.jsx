import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getExercises,
  getLogs,
  logExercise,
  addExercise,
  deleteExercise,
  resetToInitialData,
} from '../services/exerciseService';

import ExerciseCheckList from '../components/ExerciseCheckList';
import ExerciseStreakChart from '../components/ExerciseStreakChart';
import ExerciseCalendarChart from '../components/ExerciseCalendarChart';
import AddExerciseForm from '../components/AddExerciseForm';

import {
  Dumbbell,
  Flame,
  Calendar,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
} from 'lucide-react';

export default function ExercisesPage() {
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bugungi sana asos qilinadi
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Ma'lumotlarni yuklash
  const fetchData = useCallback(async () => {
    try {
      const [fetchedExercises, fetchedLogs] = await Promise.all([
        getExercises(),
        getLogs(),
      ]);
      setExercises(fetchedExercises);
      setLogs(fetchedLogs);
      setError(null);
    } catch (err) {
      console.error("Ma'lumotlarni yuklashda xatolik:", err);
      setError("Ma'lumotlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getExercises(), getLogs()])
      .then(([fetchedExercises, fetchedLogs]) => {
        if (active) {
          setExercises(fetchedExercises);
          setLogs(fetchedLogs);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Ma'lumotlarni yuklashda xatolik:", err);
        if (active) {
          setError("Ma'lumotlarni yuklab bo'lmadi");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Xabarnoma ko'rsatish
  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Mashq holatini o'zgartirish (Checkbox bosilganda)
  const handleToggleExercise = async (exerciseId, completed) => {
    // Optimistik yangilash
    const nowTime = new Date().toTimeString().slice(0, 5);
    setLogs((prevLogs) => {
      const filtered = prevLogs.filter(
        (l) => !(l.exerciseId === exerciseId && l.date === selectedDate)
      );
      if (completed) {
        return [
          ...filtered,
          {
            id: `log_${selectedDate}_${exerciseId}`,
            exerciseId,
            date: selectedDate,
            completed: true,
            completedAt: nowTime,
          },
        ];
      }
      return filtered;
    });

    try {
      await logExercise(exerciseId, selectedDate, completed);
      const exName = exercises.find((e) => e.id === exerciseId)?.name || 'Mashq';
      if (completed) {
        showNotification(`✓ "${exName}" bajarildi deb belgilandi!`);
      }
    } catch (err) {
      console.error('Mashqni saqlashda xatolik:', err);
      // Xato bo'lsa qayta sinxronizatsiya
      fetchData();
      showNotification("Holatni saqlashda xatolik yuz berdi");
    }
  };

  // Yangi mashq qo'shish
  const handleAddExercise = async (exerciseData) => {
    try {
      const created = await addExercise(exerciseData);
      setExercises((prev) => [...prev, created]);
      showNotification(`🎉 Yangi "${created.name}" mashqi muvaffaqiyatli qo'shildi!`);
    } catch (err) {
      console.error("Mashq qo'shishda xatolik:", err);
      showNotification("Yangi mashq qo'shib bo'lmadi");
    }
  };

  // Mashqni o'chirish
  const handleDeleteExercise = async (exerciseId) => {
    if (typeof deleteExercise === 'function') {
      try {
        await deleteExercise(exerciseId);
        setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
        setLogs((prev) => prev.filter((l) => l.exerciseId !== exerciseId));
        showNotification("Mashq o'chirildi");
      } catch (err) {
        console.error("Mashqni o'chirishda xatolik:", err);
      }
    }
  };

  // Boshlang'ich mock ma'lumotlarga qaytarish
  const handleResetData = async () => {
    if (window.confirm("Barcha ma'lumotlarni boshlang'ich holatga qaytarishni tasdiqlaysizmi?")) {
      if (typeof resetToInitialData === 'function') {
        await resetToInitialData();
        fetchData();
        showNotification("Boshlang'ich ma'lumotlar qayta yuklandi!");
      }
    }
  };

  // Sana o'zgartirish (bir kun oldinga yoki orqaga)
  const shiftDate = (days) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Bugungi ko'rsatkichlar
  const todayStr = getTodayString();
  const isSelectedToday = selectedDate === todayStr;

  const todayCompletedCount = useMemo(() => {
    const exerciseIds = new Set(exercises.map((e) => e.id));
    return logs.filter(
      (l) => l.date === selectedDate && l.completed && exerciseIds.has(l.exerciseId)
    ).length;
  }, [logs, selectedDate, exercises]);

  const totalExercisesCount = exercises.length;
  const todayPercent = totalExercisesCount > 0
    ? Math.round((todayCompletedCount / totalExercisesCount) * 100)
    : 0;

  // Joriy va rekord seriya
  const streakStats = useMemo(() => {
    let currentStreak = 0;
    const baseDate = new Date(todayStr);

    // Bugungi kun tekshiruvi
    const todayHasDone = logs.some((l) => l.date === todayStr && l.completed);
    if (todayHasDone) currentStreak++;

    let cur = new Date(baseDate);
    cur.setDate(cur.getDate() - 1);
    while (true) {
      const dStr = cur.toISOString().split('T')[0];
      const hasDone = logs.some((l) => l.date === dStr && l.completed);
      if (hasDone) {
        currentStreak++;
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
      }
    }

    return { currentStreak };
  }, [logs, todayStr]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Yuqori Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
                  Mashqlar Nazorati
                </h1>
                <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Faol
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Kunlik odatlar, checklist va faollik diagrammalari
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Reset mock data */}
            <button
              id="reset-mock-data-btn"
              type="button"
              onClick={handleResetData}
              title="Boshlang'ich mock ma'lumotlarga qaytarish"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Yangi mashq qo'shish tugmasi */}
            <button
              id="header-add-exercise-btn"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Yangi mashq qo'shish</span>
              <span className="sm:hidden">Qo'shish</span>
            </button>
          </div>
        </div>
      </header>

      {/* Asosiy Kontent */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-600">Mashqlar yuklanmoqda...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
            <p className="text-sm font-medium text-rose-800">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="mt-3 px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition"
            >
              Qayta urinish
            </button>
          </div>
        ) : (
          <>
            {/* Sana Boshqaruvi va Tezkor Holat */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Sana navigatori */}
          <div className="flex items-center gap-2">
            <button
              id="prev-date-btn"
              type="button"
              onClick={() => shiftDate(-1)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              title="Bir kun oldinga"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <input
                id="selected-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="text-xs sm:text-sm font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>

            <button
              id="next-date-btn"
              type="button"
              onClick={() => shiftDate(1)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              title="Bir kun keyinga"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isSelectedToday && (
              <button
                id="today-shortcut-btn"
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
              >
                Bugunga o'tish
              </button>
            )}
          </div>

          {/* Qisqa ma'lumotlar bloki */}
          <div className="flex items-center gap-4 sm:gap-6 divide-x divide-slate-100">
            <div>
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                {isSelectedToday ? 'Bugungi reja' : `${selectedDate} reja`}
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-1.5">
                <span>{todayCompletedCount} / {totalExercisesCount} mashq</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {todayPercent}%
                </span>
              </div>
            </div>

            <div className="pl-4 sm:pl-6">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Ketma-ketlik
              </div>
              <div className="text-base sm:text-lg font-bold text-amber-600 flex items-center gap-1">
                <Flame className="w-4 h-4 fill-amber-500" />
                <span>{streakStats.currentStreak} kunlik seriya</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1-DIAGRAMMA: Checkbox bo'yicha kunlik progress & Streak */}
        <section id="streak-chart-section">
          <ExerciseStreakChart
            exercises={exercises}
            logs={logs}
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(date)}
          />
        </section>

        {/* 2-DIAGRAMMA: Qaysi kunlar bajarilgan (Oylik taqvim xaritasi) */}
        <section id="calendar-chart-section">
          <ExerciseCalendarChart
            exercises={exercises}
            logs={logs}
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(date)}
          />
        </section>

        {/* ASOSIY CHECKLIST: Bugungi mashqlar va checkboxlar */}
        <section id="exercise-checklist-section">
          <ExerciseCheckList
            exercises={exercises}
            logs={logs}
            selectedDate={selectedDate}
            onToggleExercise={handleToggleExercise}
            onDeleteExercise={handleDeleteExercise}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />
        </section>
        </>
        )}
      </main>

      {/* Yangi Mashq Qo'shish Formasi (Modal) */}
      <AddExerciseForm
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddExercise={handleAddExercise}
      />
    </div>
  );
}
