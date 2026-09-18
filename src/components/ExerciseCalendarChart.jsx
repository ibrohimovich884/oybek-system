import { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const MONTH_NAMES_UZ = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentabr',
  'Oktabr',
  'Noyabr',
  'Dekabr',
];

const WEEK_DAYS_UZ = ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'];

export default function ExerciseCalendarChart({
  exercises = [],
  logs = [],
  selectedDate,
  onSelectDate,
}) {
  // Bugungi sana asos qilib olinadi: 2026-09-18
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  // Joriy ko'rilayotgan yil va oy
  const [viewYear, setViewYear] = useState(() => {
    if (selectedDate) {
      return parseInt(selectedDate.split('-')[0], 10);
    }
    return today.getFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDate) {
      return parseInt(selectedDate.split('-')[1], 10) - 1;
    }
    return today.getMonth();
  });

  // Kunlar bo'yicha loglarni umumlashtirish (date -> { completedCount, totalPossible })
  const logsByDate = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => {
      if (log.completed) {
        const count = map.get(log.date) || 0;
        map.set(log.date, count + 1);
      }
    });
    return map;
  }, [logs]);

  const totalExercisesCount = exercises.length || 1;

  // Oy bo'yicha navigatsiya
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    if (onSelectDate) {
      onSelectDate(todayStr);
    }
  };

  // Kalendar kataklarini yasash (dushanbadan yakshanbagacha)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const totalDays = lastDay.getDate();

    // Haftaning qaysi kunidan boshlanishi (0 - Yakshanba, 1 - Dushanba...)
    // Biz Dushanba (0) dan Yakshanba (6) gacha moslashtiramiz
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const cells = [];

    // Oldingi oydan to'ldirish (bo'sh kataklar)
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ type: 'empty', key: `empty-${i}` });
    }

    // Joriy oyning barcha kunlari
    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(viewMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${viewYear}-${monthStr}-${dayStr}`;

      const completedCount = logsByDate.get(dateStr) || 0;
      const percent = Math.min(100, Math.round((completedCount / totalExercisesCount) * 100));

      cells.push({
        type: 'day',
        dayNumber: d,
        dateStr,
        completedCount,
        percent,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        key: dateStr,
      });
    }

    return cells;
  }, [viewYear, viewMonth, logsByDate, totalExercisesCount, todayStr, selectedDate]);

  // Ushbu oy statistikasi
  const monthStats = useMemo(() => {
    let activeDays = 0;
    let perfectDays = 0;
    let totalRepsDone = 0;

    calendarCells.forEach((c) => {
      if (c.type === 'day' && c.completedCount > 0) {
        activeDays++;
        totalRepsDone += c.completedCount;
        if (c.percent === 100) {
          perfectDays++;
        }
      }
    });

    return { activeDays, perfectDays, totalRepsDone };
  }, [calendarCells]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6">
      {/* Header & Oy boshqaruvi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CalendarIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Bajarilgan Kunlar Taqvim Xaritasi (2-diagramma)
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Qaysi kunlarda qancha mashq bajarilganini ko'rsatuvchi oylik faollik xaritasi
          </p>
        </div>

        {/* Oyni almashtirish */}
        <div className="flex items-center gap-2">
          <button
            id="cal-jump-today-btn"
            type="button"
            onClick={handleJumpToToday}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
          >
            Bugun
          </button>
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              id="cal-prev-month-btn"
              type="button"
              onClick={handlePrevMonth}
              className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition cursor-pointer"
              title="Oldingi oy"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 min-w-[120px] text-center text-slate-800">
              {MONTH_NAMES_UZ[viewMonth]} {viewYear}
            </span>
            <button
              id="cal-next-month-btn"
              type="button"
              onClick={handleNextMonth}
              className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition cursor-pointer"
              title="Keyingi oy"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Oylik qisqa natija */}
      <div className="grid grid-cols-3 gap-3 my-5">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="text-xs text-slate-500">Faol kunlar</div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            {monthStats.activeDays} <span className="text-xs font-normal text-slate-500">kun</span>
          </div>
        </div>
        <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100">
          <div className="text-xs text-emerald-700">100% to'liq kunlar</div>
          <div className="text-lg font-bold text-emerald-900 mt-0.5">
            {monthStats.perfectDays} <span className="text-xs font-normal text-emerald-600">kun</span>
          </div>
        </div>
        <div className="bg-indigo-50/70 rounded-xl p-3 border border-indigo-100">
          <div className="text-xs text-indigo-700">Jami bajarishlar</div>
          <div className="text-lg font-bold text-indigo-900 mt-0.5">
            {monthStats.totalRepsDone} <span className="text-xs font-normal text-indigo-600">ta</span>
          </div>
        </div>
      </div>

      {/* Taqvim jadvali */}
      <div className="pt-2">
        {/* Hafta kunlari nomi */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center">
          {WEEK_DAYS_UZ.map((day, idx) => (
            <div
              key={day}
              className={`text-xs font-semibold py-1 ${
                idx >= 5 ? 'text-amber-600' : 'text-slate-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Kataklar */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarCells.map((cell) => {
            if (cell.type === 'empty') {
              return (
                <div
                  key={cell.key}
                  className="aspect-square rounded-xl bg-slate-50/40 border border-transparent"
                />
              );
            }

            // Katak rangini foiz bo'yicha aniqlash
            let cellBg = 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80';
            let badge = null;

            if (cell.percent === 100) {
              cellBg = 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-emerald-600 shadow-xs';
              badge = <Sparkles className="w-3 h-3 text-emerald-200" />;
            } else if (cell.percent >= 66) {
              cellBg = 'bg-emerald-400 hover:bg-emerald-500 text-white font-semibold border-emerald-400';
            } else if (cell.percent >= 33) {
              cellBg = 'bg-emerald-200 hover:bg-emerald-300 text-emerald-900 font-medium border-emerald-300';
            } else if (cell.completedCount > 0) {
              cellBg = 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-200';
            }

            return (
              <button
                key={cell.key}
                id={`calendar-day-${cell.dateStr}`}
                type="button"
                onClick={() => onSelectDate && onSelectDate(cell.dateStr)}
                className={`relative group aspect-square rounded-xl border p-1 sm:p-2 flex flex-col justify-between transition-all cursor-pointer ${cellBg} ${
                  cell.isSelected ? 'ring-2 ring-indigo-600 ring-offset-2 z-10' : ''
                } ${cell.isToday ? 'outline outline-2 outline-amber-400 outline-offset-1' : ''}`}
              >
                {/* Sana raqami */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs sm:text-sm leading-none">{cell.dayNumber}</span>
                  {badge}
                </div>

                {/* Bajarilgan mashqlar soni indikatori */}
                <div className="text-[10px] sm:text-xs leading-none self-end">
                  {cell.completedCount > 0 ? (
                    <span className="opacity-90 font-medium">
                      {cell.completedCount}/{totalExercisesCount}
                    </span>
                  ) : (
                    <span className="opacity-30">-</span>
                  )}
                </div>

                {/* Bugun belgisi */}
                {cell.isToday && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white" />
                )}

                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 bg-slate-900 text-white text-[11px] rounded-md py-1 px-2 whitespace-nowrap shadow-lg">
                  <div>{cell.dateStr}</div>
                  <div className="font-semibold">
                    {cell.completedCount} / {totalExercisesCount} mashq ({cell.percent}%)
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend (Ranglar ma'nosi) */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-medium">Faollik:</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300" /> 0 ta
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" /> 1-2 ta
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-400" /> 3-4 ta
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-600" /> To'liq (100%)
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-amber-400" /> Bugungi sana
          </div>
        </div>
      </div>
    </div>
  );
}
