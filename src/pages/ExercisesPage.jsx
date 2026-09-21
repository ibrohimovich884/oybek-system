import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  Clock,
  CheckCircle2,
  Home,
} from 'lucide-react';

export default function ExercisesPage() {
  const [showDemoPreview, setShowDemoPreview] = useState(false);
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
    <div className="exercises-page">
      {/* Toast Notification */}
      {notification && (
        <div
          className="feedback-alert feedback-alert--success"
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 999,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <Sparkles size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Yuqori sarlavha */}
      <div className="page-header-row">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h1 className="page-title">Mashqlar nazorati</h1>
            <span className="sidebar__badge">Tez kunda</span>
          </div>
          <p className="page-subtitle">
            Kunlik badantarbiya, mashqlar checklisti va natijalar monitoringi tizimi.
          </p>
        </div>
      </div>

      {!showDemoPreview ? (
        /* Standart ko'rinish: Tez kunda xabari */
        <div className="exercises-coming-soon">
          <div className="coming-soon-hero">
            <div className="coming-soon-badge-row">
              <Clock size={13} />
              <span>Ishlab chiqilmoqda</span>
            </div>

            <div className="coming-soon-icon-box">
              <Dumbbell size={36} />
            </div>

            <h2 className="coming-soon-title">Mashqlar bo'limi — Tez kunda!</h2>
            <p className="coming-soon-subtitle">
              Ushbu bo'lim hozirda tayyorlanmoqda va keyingi yangilanishda to'liq foydalanishga topshiriladi.
              Bu yerda kunlik mashqlarni rejalashtirish, cheklistlarni to'ldirish hamda ketma-ketlik (streak) natijalarini kuzatish imkoniyati yaratilmoqda.
            </p>

            <div className="coming-soon-actions">
              <Link
                to="/"
                className="btn btn--primary"
                style={{
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                }}
              >
                <Home size={16} />
                <span>Bosh sahifaga qaytish</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowDemoPreview(true)}
                className="btn btn--subtle"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  cursor: "pointer",
                  background: "var(--surface-3)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              >
                <Sparkles size={16} style={{ color: "var(--accent)" }} />
                <span>Dastlabki namunani ko'rish</span>
              </button>
            </div>
          </div>

          <div className="coming-soon-features-grid">
            <div className="coming-soon-feature-card">
              <div className="coming-soon-feature-header">
                <div className="coming-soon-feature-icon" style={{ color: "var(--accent)" }}>
                  <CheckCircle2 size={20} />
                </div>
                <span className="coming-soon-feature-title">Kunlik checklist</span>
              </div>
              <p className="coming-soon-feature-desc">
                Har kunlik badantarbiya va mashqlarni birma-bir bajarilgan deb belgilash va vaqtini qayd etish.
              </p>
            </div>

            <div className="coming-soon-feature-card">
              <div className="coming-soon-feature-header">
                <div className="coming-soon-feature-icon" style={{ color: "#f59e0b" }}>
                  <Flame size={20} />
                </div>
                <span className="coming-soon-feature-title">Seriyalar (Streak)</span>
              </div>
              <p className="coming-soon-feature-desc">
                Kunlik mashg'ulotlarni uzmasdan bajarish orqali intizomli ketma-ketlik rekordi o'rnatish.
              </p>
            </div>

            <div className="coming-soon-feature-card">
              <div className="coming-soon-feature-header">
                <div className="coming-soon-feature-icon" style={{ color: "var(--karta)" }}>
                  <Calendar size={20} />
                </div>
                <span className="coming-soon-feature-title">Oylik tahlil & Taqvim</span>
              </div>
              <p className="coming-soon-feature-desc">
                Har oyning qaysi kunlarida faol bo'lganingizni qulay vizual taqvim orqali kuzatish.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Dastlabki namunaviy interfeys */
        <div className="exercises-demo-preview" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
          <div className="preview-mode-banner">
            <div className="preview-mode-banner__text">
              <Sparkles size={18} />
              <span>Dastlabki sinov rejimi: To'liq versiya tez kunda ishga tushiriladi.</span>
            </div>
            <button
              type="button"
              onClick={() => setShowDemoPreview(false)}
              className="btn btn--subtle"
              style={{
                background: "var(--surface)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                color: "var(--text)",
                padding: "6px 14px",
                fontSize: "var(--fs-xs)",
                cursor: "pointer",
              }}
            >
              Yopish (Tez kunda ko'rinishiga qaytish)
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "8px" }}>
            <button
              id="reset-mock-data-btn"
              type="button"
              onClick={handleResetData}
              title="Boshlang'ich mock ma'lumotlarga qaytarish"
              className="btn btn--subtle"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
            >
              <RefreshCw size={14} />
              <span>Qayta yuklash</span>
            </button>

            <button
              id="header-add-exercise-btn"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn--primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
            >
              <Plus size={16} />
              <span>Yangi mashq</span>
            </button>
          </div>

          {loading ? (
            <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
              <Loader2 className="animate-spin" size={28} style={{ color: "var(--accent)", margin: "0 auto 12px" }} />
              <p style={{ color: "var(--text-muted)" }}>Mashqlar yuklanmoqda...</p>
            </div>
          ) : error ? (
            <div className="feedback-alert feedback-alert--error" style={{ justifyContent: "center" }}>
              <span>{error}</span>
              <button
                type="button"
                onClick={fetchData}
                className="btn btn--subtle"
                style={{ marginLeft: "12px", cursor: "pointer" }}
              >
                Qayta urinish
              </button>
            </div>
          ) : (
            <>
              {/* Sana Boshqaruvi va Tezkor Holat */}
              <div
                className="panel"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  padding: "16px",
                }}
              >
                {/* Sana navigatori */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    id="prev-date-btn"
                    type="button"
                    onClick={() => shiftDate(-1)}
                    className="btn btn--subtle"
                    title="Bir kun oldinga"
                    style={{ padding: "8px", cursor: "pointer" }}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "var(--surface-2)",
                      padding: "6px 12px",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Calendar size={16} style={{ color: "var(--accent)" }} />
                    <input
                      id="selected-date-picker"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text)",
                        fontSize: "var(--fs-sm)",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    />
                  </div>

                  <button
                    id="next-date-btn"
                    type="button"
                    onClick={() => shiftDate(1)}
                    className="btn btn--subtle"
                    title="Bir kun keyinga"
                    style={{ padding: "8px", cursor: "pointer" }}
                  >
                    <ChevronRight size={16} />
                  </button>

                  {!isSelectedToday && (
                    <button
                      id="today-shortcut-btn"
                      type="button"
                      onClick={() => setSelectedDate(todayStr)}
                      className="btn btn--subtle"
                      style={{
                        color: "var(--accent)",
                        borderColor: "var(--accent-border)",
                        cursor: "pointer",
                      }}
                    >
                      Bugunga o'tish
                    </button>
                  )}
                </div>

                {/* Qisqa ma'lumotlar bloki */}
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  <div>
                    <div style={{ fontSize: "var(--fs-2xs)", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      {isSelectedToday ? "Bugungi reja" : `${selectedDate} reja`}
                    </div>
                    <div style={{ fontSize: "var(--fs-md)", fontWeight: "700", color: "var(--text)" }}>
                      {todayCompletedCount} / {totalExercisesCount} mashq ({todayPercent}%)
                    </div>
                  </div>

                  <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: "16px" }}>
                    <div style={{ fontSize: "var(--fs-2xs)", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Ketma-ketlik
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fs-md)",
                        fontWeight: "700",
                        color: "#f59e0b",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Flame size={18} fill="#f59e0b" />
                      <span>{streakStats.currentStreak} kunlik</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1-DIAGRAMMA */}
              <section id="streak-chart-section">
                <ExerciseStreakChart
                  exercises={exercises}
                  logs={logs}
                  selectedDate={selectedDate}
                  onSelectDate={(date) => setSelectedDate(date)}
                />
              </section>

              {/* 2-DIAGRAMMA */}
              <section id="calendar-chart-section">
                <ExerciseCalendarChart
                  exercises={exercises}
                  logs={logs}
                  selectedDate={selectedDate}
                  onSelectDate={(date) => setSelectedDate(date)}
                />
              </section>

              {/* ASOSIY CHECKLIST */}
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

          {/* Yangi Mashq Qo'shish Formasi (Modal) */}
          <AddExerciseForm
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onAddExercise={handleAddExercise}
          />
        </div>
      )}
    </div>
  );
}
