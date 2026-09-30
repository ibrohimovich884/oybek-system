import { useState, useMemo } from 'react';
import { Flame, Trophy, TrendingUp, Zap } from 'lucide-react';

export default function ExerciseStreakChart({ exercises = [], logs = [], onSelectDate, selectedDate }) {
  const [rangeDays, setRangeDays] = useState(14); // 7, 14, 30

  // Barcha kunlar uchun loglarni sana bo'yicha guruhlaymiz
  const dateStats = useMemo(() => {
    const totalExercisesCount = exercises.length || 1;
    const map = new Map();

    logs.forEach((log) => {
      if (log.completed) {
        const count = map.get(log.date) || 0;
        map.set(log.date, count + 1);
      }
    });

    return { map, totalExercisesCount };
  }, [exercises, logs]);

  // Bugungi sana va hisob-kitoblar
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Streak (ketma-ketlik) hisoblash: bugundan orqaga qarab
  const streakInfo = useMemo(() => {
    let currentStreak = 0;
    let maxStreak = 0;

    const baseDate = new Date(todayStr);
    
    // Bugungi kun bajarilganmi?
    const todayDoneCount = dateStats.map.get(todayStr) || 0;
    const isTodayDone = todayDoneCount > 0;
    
    if (isTodayDone) {
      currentStreak++;
    }

    // Bugundan oldingi kunlarni tekshiramiz
    let checkDate = new Date(baseDate);
    checkDate.setDate(checkDate.getDate() - 1);

    while (true) {
      const dateKey = checkDate.toISOString().split('T')[0];
      const doneCount = dateStats.map.get(dateKey) || 0;
      // Agar kamida 1 ta mashq bajarilgan bo'lsa seriya davom etadi
      if (doneCount > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Eng uzun ketma-ketlikni topamiz (tarix bo'ylab)
    const allDates = Array.from(dateStats.map.keys()).sort();
    let tempStreak = 0;
    for (let i = 0; i < allDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prev = new Date(allDates[i - 1]);
        const curr = new Date(allDates[i]);
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
    }

    maxStreak = Math.max(maxStreak, currentStreak);

    return { currentStreak, maxStreak };
  }, [dateStats, todayStr]);

  // Diagramma uchun oxirgi N kunlik ma'lumotlar
  const chartData = useMemo(() => {
    const data = [];
    const baseDate = new Date(todayStr);
    const dayNames = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];

    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const completedCount = dateStats.map.get(dateKey) || 0;
      const totalCount = dateStats.totalExercisesCount;
      const percent = Math.min(100, Math.round((completedCount / totalCount) * 100));

      data.push({
        date: dateKey,
        dayName: dayNames[d.getDay()],
        dayNumber: d.getDate(),
        monthNumber: d.getMonth() + 1,
        completedCount,
        totalCount,
        percent,
        isToday: dateKey === todayStr,
        isSelected: dateKey === selectedDate,
      });
    }

    return data;
  }, [rangeDays, todayStr, selectedDate, dateStats]);

  // Tanlangan oraliqdagi o'rtacha foiz
  const averageCompletion = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, curr) => acc + curr.percent, 0);
    return Math.round(sum / chartData.length);
  }, [chartData]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Kunlik Progress & Seriya (1-diagramma)
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Har bir kunda checkboxlar orqali bajarilgan mashqlar foizi
          </p>
        </div>

        {/* Kunlar oralig'ini tanlash */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            id="streak-range-7"
            type="button"
            onClick={() => setRangeDays(7)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
              rangeDays === 7 ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 kun
          </button>
          <button
            id="streak-range-14"
            type="button"
            onClick={() => setRangeDays(14)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
              rangeDays === 14 ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            14 kun
          </button>
          <button
            id="streak-range-30"
            type="button"
            onClick={() => setRangeDays(30)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
              rangeDays === 30 ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30 kun
          </button>
        </div>
      </div>

      {/* Tezkor Ko'rsatkichlar (Streak Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-lg shadow-xs">
            <Flame className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="text-xs font-medium text-amber-800">Joriy seriya</div>
            <div className="text-xl font-bold text-amber-950">
              {streakInfo.currentStreak} <span className="text-xs font-normal text-amber-700">kun</span>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-emerald-800">Rekord seriya</div>
            <div className="text-xl font-bold text-emerald-950">
              {streakInfo.maxStreak} <span className="text-xs font-normal text-emerald-700">kun</span>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-indigo-800">O'rtacha progress</div>
            <div className="text-xl font-bold text-indigo-950">{averageCompletion}%</div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2 bg-slate-800 text-white rounded-lg shadow-xs">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-600">Bugungi holat</div>
            <div className="text-xl font-bold text-slate-900">
              {chartData.find((d) => d.isToday)?.percent || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Kunlik Progress Ustunli Diagrammasi */}
      <div className="pt-2">
        <div className="flex items-end gap-1.5 sm:gap-2 h-44 sm:h-52 w-full pt-6 pb-2 px-1 border-b border-slate-200">
          {chartData.map((item) => {
            // Ustun rangini foiziga qarab tanlaymiz
            let barColor = 'bg-slate-200 hover:bg-slate-300';
            if (item.percent === 100) {
              barColor = 'bg-emerald-500 hover:bg-emerald-600';
            } else if (item.percent >= 66) {
              barColor = 'bg-emerald-400 hover:bg-emerald-500';
            } else if (item.percent >= 33) {
              barColor = 'bg-amber-400 hover:bg-amber-500';
            } else if (item.percent > 0) {
              barColor = 'bg-orange-300 hover:bg-orange-400';
            }

            const isSelected = item.isSelected;

            return (
              <div
                key={item.date}
                className="group relative flex-1 flex flex-col items-center justify-end h-full cursor-pointer"
                onClick={() => onSelectDate && onSelectDate(item.date)}
              >
                {/* Hover Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute -top-12 z-20 bg-slate-900 text-white text-[11px] rounded-md py-1.5 px-2.5 whitespace-nowrap shadow-md">
                  <div className="font-bold">{item.date} ({item.dayName})</div>
                  <div>
                    {item.completedCount}/{item.totalCount} ta mashq ({item.percent}%)
                  </div>
                </div>

                {/* Foiz yozuvi (faqat kengroq ekranlar yoki ustun baland bo'lganda) */}
                {rangeDays <= 14 && (
                  <span className="text-[10px] font-medium text-slate-400 mb-1">
                    {item.percent > 0 ? `${item.percent}%` : ''}
                  </span>
                )}

                {/* Ustun (Bar) */}
                <div className="w-full max-w-[32px] bg-slate-100 rounded-t-md h-full flex items-end overflow-hidden">
                  <div
                    className={`w-full transition-all duration-300 rounded-t-md ${barColor} ${
                      isSelected ? 'ring-2 ring-emerald-600 ring-offset-1' : ''
                    }`}
                    style={{ height: `${Math.max(item.percent > 0 ? item.percent : 6, 6)}%` }}
                  />
                </div>

                {/* Sana yozuvi */}
                <div className="mt-2 text-center">
                  <span
                    className={`text-[11px] block font-medium leading-none ${
                      item.isToday
                        ? 'text-emerald-700 font-bold bg-emerald-100 px-1 py-0.5 rounded'
                        : isSelected
                        ? 'text-slate-900 font-bold'
                        : 'text-slate-500'
                    }`}
                  >
                    {item.dayNumber}
                  </span>
                  {rangeDays <= 14 && (
                    <span className="text-[9px] text-slate-400 uppercase tracking-tighter">
                      {item.dayName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Diagramma tagidagi izoh (Legend) */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 mt-3 pt-1">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> 100% bajarilgan
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-400" /> 66-99%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-400" /> 33-65%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-200" /> 0%
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            * Ustun ustiga bosib, o'sha kundagi mashqlarni ko'rish mumkin
          </div>
        </div>
      </div>
    </div>
  );
}
