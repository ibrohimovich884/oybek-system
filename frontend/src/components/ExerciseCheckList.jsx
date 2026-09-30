import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Dumbbell,
  Zap,
  Activity,
  Shield,
  HeartPulse,
  Plus,
  Filter,
  Sparkles,
  Trash2,
} from 'lucide-react';

const iconMap = {
  Flame,
  Dumbbell,
  Zap,
  Activity,
  Shield,
  HeartPulse,
};

const categoryColors = {
  Kuch: 'bg-amber-50 text-amber-700 border-amber-200',
  Kardio: 'bg-rose-50 text-rose-700 border-rose-200',
  'Oyoq & Qorin': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Matonat: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Moslashuvchanlik: 'bg-teal-50 text-teal-700 border-teal-200',
  Umumiy: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function ExerciseCheckList({
  exercises = [],
  logs = [],
  selectedDate,
  onToggleExercise,
  onDeleteExercise,
  onOpenAddModal,
}) {
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'pending'
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Tanlangan sana bo'yicha loglarni xaritaga olamiz (exerciseId => log)
  const logMap = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => {
      if (log.date === selectedDate && log.completed) {
        map.set(log.exerciseId, log);
      }
    });
    return map;
  }, [logs, selectedDate]);

  // Statistik hisoblar
  const totalCount = exercises.length;
  const completedCount = exercises.filter((ex) => logMap.has(ex.id)).length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Kategoriyalar ro'yxati
  const categories = useMemo(() => {
    const set = new Set();
    exercises.forEach((ex) => {
      if (ex.category) set.add(ex.category);
    });
    return ['all', ...Array.from(set)];
  }, [exercises]);

  // Filtrlangan mashqlar
  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const isDone = logMap.has(ex.id);
      if (filter === 'completed' && !isDone) return false;
      if (filter === 'pending' && isDone) return false;
      if (categoryFilter !== 'all' && ex.category !== categoryFilter) return false;
      return true;
    });
  }, [exercises, logMap, filter, categoryFilter]);

  // Sana ko'rinishi
  const isToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate === today;
  };

  const handleMarkAll = () => {
    const allDone = completedCount === totalCount;
    exercises.forEach((ex) => {
      onToggleExercise(ex.id, !allDone);
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 transition-all">
      {/* Yuqori sarlavha qismi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              {isToday() ? "Bugungi mashqlar ro'yxati" : `${selectedDate} kungi mashqlar`}
            </h2>
            {completionPercent === 100 && totalCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Barcha mashqlar bajarildi!
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Har bir mashqni bajargach belgilang, bu kunlik progressga ta'sir qiladi
          </p>
        </div>

        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <button
              id="toggle-all-exercises-btn"
              type="button"
              onClick={handleMarkAll}
              className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
            >
              {completedCount === totalCount ? "Barchasini bekor qilish" : "Barchasini bajarish"}
            </button>
          )}
          <button
            id="open-add-exercise-modal-btn"
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi mashq</span>
          </button>
        </div>
      </div>

      {/* Progress chizig'i */}
      <div className="my-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex justify-between items-center text-sm font-medium mb-2">
          <span className="text-slate-700">
            Progress: <strong className="text-slate-900">{completedCount}</strong> dan {totalCount} ta bajarildi
          </span>
          <span className={`font-bold ${completionPercent === 100 ? 'text-emerald-600' : 'text-slate-800'}`}>
            {completionPercent}%
          </span>
        </div>
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              completionPercent === 100 ? 'bg-emerald-500' : 'bg-emerald-600'
            }`}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Filter va saralash teglari */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        {/* Status filtrlari */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            id="filter-all-btn"
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Barchasi ({totalCount})
          </button>
          <button
            id="filter-pending-btn"
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
              filter === 'pending'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Qolgan ({totalCount - completedCount})
          </button>
          <button
            id="filter-completed-btn"
            type="button"
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
              filter === 'completed'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bajarilgan ({completedCount})
          </button>
        </div>

        {/* Kategoriya filtri */}
        {categories.length > 2 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <select
              id="category-filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Barcha toifalar</option>
              {categories
                .filter((c) => c !== 'all')
                .map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Mashqlar ro'yxati */}
      <div className="space-y-2.5">
        {filteredExercises.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Activity className="w-10 h-10 mx-auto text-slate-400 mb-2 stroke-1" />
            <p className="text-sm font-medium text-slate-700">Hech qanday mashq topilmadi</p>
            <p className="text-xs text-slate-500 mt-1">
              Filtrni o'zgartirib ko'ring yoki yuqoridagi tugma orqali yangi mashq qo'shing
            </p>
          </div>
        ) : (
          filteredExercises.map((exercise) => {
            const isCompleted = logMap.has(exercise.id);
            const logItem = logMap.get(exercise.id);
            const IconComponent = iconMap[exercise.icon] || Activity;
            const categoryBadgeColor =
              categoryColors[exercise.category] || categoryColors.Umumiy;

            return (
              <div
                key={exercise.id}
                id={`exercise-item-${exercise.id}`}
                className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/40 border-emerald-200 text-slate-800'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200 text-slate-900 shadow-xs'
                }`}
              >
                {/* Chap qism: Checkbox va Mashq ma'lumotlari */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0 mr-3">
                  <button
                    id={`checkbox-${exercise.id}`}
                    type="button"
                    onClick={() => onToggleExercise(exercise.id, !isCompleted)}
                    className="flex-shrink-0 cursor-pointer text-slate-400 hover:text-emerald-600 focus:outline-none transition-transform active:scale-95"
                    aria-label={isCompleted ? `${exercise.name}ni bekor qilish` : `${exercise.name}ni bajarildi deb belgilash`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-300 hover:text-slate-400" />
                    )}
                  </button>

                  <div className="p-2 rounded-lg bg-slate-100 text-slate-700 flex-shrink-0">
                    <IconComponent className="w-4 h-4 text-slate-600" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-semibold text-sm truncate ${
                          isCompleted ? 'line-through text-slate-500' : 'text-slate-900'
                        }`}
                      >
                        {exercise.name}
                      </span>
                      {exercise.category && (
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${categoryBadgeColor}`}
                        >
                          {exercise.category}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">Mo'ljal: {exercise.target}</span>
                      {exercise.durationMinutes && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {exercise.durationMinutes} daqiqa
                        </span>
                      )}
                      {exercise.calories && (
                        <span className="inline-flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-500" />
                          ~{exercise.calories} kkal
                        </span>
                      )}
                      {isCompleted && logItem?.completedAt && (
                        <span className="text-emerald-700 font-medium bg-emerald-100/70 px-1.5 py-0.2 rounded text-[11px]">
                          ✓ {logItem.completedAt} da bajarildi
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* O'ng qism: O'chirish tugmasi */}
                {onDeleteExercise && (
                  <button
                    id={`delete-exercise-${exercise.id}`}
                    type="button"
                    onClick={() => {
                      if (window.confirm(`"${exercise.name}" mashqini o'chirishni xohlaysizmi?`)) {
                        onDeleteExercise(exercise.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    title="Mashqni o'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
