// Boshlang'ich mashqlar va o'tgan kunlar uchun tarixiy logs

export const initialExercises = [
  {
    id: 'ex_1',
    name: 'Turnikda tortilish (Pull-ups)',
    category: 'Kuch',
    target: '12 marta × 3 to\'plam',
    durationMinutes: 15,
    calories: 90,
    icon: 'Flame',
    createdAt: '2026-08-01'
  },
  {
    id: 'ex_2',
    name: 'Otjimaniye (Push-ups)',
    category: 'Kuch',
    target: '25 marta × 4 to\'plam',
    durationMinutes: 15,
    calories: 110,
    icon: 'Dumbbell',
    createdAt: '2026-08-01'
  },
  {
    id: 'ex_3',
    name: 'Yugurish (Kardio yugurish)',
    category: 'Kardio',
    target: '3.5 km / 20 daqiqa',
    durationMinutes: 20,
    calories: 220,
    icon: 'Zap',
    createdAt: '2026-08-01'
  },
  {
    id: 'ex_4',
    name: 'Prisedaniye (Squats)',
    category: 'Oyoq & Qorin',
    target: '30 marta × 3 to\'plam',
    durationMinutes: 15,
    calories: 130,
    icon: 'Activity',
    createdAt: '2026-08-05'
  },
  {
    id: 'ex_5',
    name: 'Planka (Core Plank)',
    category: 'Matonat',
    target: '90 soniya × 3 marta',
    durationMinutes: 10,
    calories: 60,
    icon: 'Shield',
    createdAt: '2026-08-10'
  },
  {
    id: 'ex_6',
    name: 'Ertalabki badantarbiya & Cho\'zilish',
    category: 'Moslashuvchanlik',
    target: '15 daqiqa to\'liq kompleks',
    durationMinutes: 15,
    calories: 70,
    icon: 'HeartPulse',
    createdAt: '2026-08-01'
  }
];

// O'tgan 30 kun uchun mashq bajarilganlik tarixini generatsiya qilamiz
// Asosiy sana: 2026-09-18
export const generateInitialLogs = () => {
  const logs = [];
  const baseDate = new Date('2026-09-18T12:00:00');
  
  // O'tgan 45 kun uchun haqiqiy namunaviy ma'lumotlar
  for (let i = 45; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay(); // 0 = yakshanba, 6 = shanba

    // Dam olish kuni (yakshanba) ba'zan kamroq mashq
    const completionPattern = [
      true, 
      i % 7 !== 0, 
      (i + 1) % 3 !== 0, 
      (i + 2) % 4 !== 0, 
      i % 5 !== 0, 
      true
    ];

    // Bugungi kun (i === 0, 2026-09-18) uchun 3 ta mashq bajarilgan qilib qo'yamiz
    if (i === 0) {
      logs.push(
        { id: `log_${dateStr}_ex_1`, exerciseId: 'ex_1', date: dateStr, completed: true, completedAt: '07:30' },
        { id: `log_${dateStr}_ex_2`, exerciseId: 'ex_2', date: dateStr, completed: true, completedAt: '07:50' },
        { id: `log_${dateStr}_ex_6`, exerciseId: 'ex_6', date: dateStr, completed: true, completedAt: '08:15' }
      );
      continue;
    }

    initialExercises.forEach((ex, idx) => {
      const isDone = completionPattern[idx];
      if (isDone && dayOfWeek !== 0) {
        logs.push({
          id: `log_${dateStr}_${ex.id}`,
          exerciseId: ex.id,
          date: dateStr,
          completed: true,
          completedAt: '08:00'
        });
      } else if (dayOfWeek === 0 && (idx === 2 || idx === 5)) {
        // Yakshanba faqat yugurish va cho'zilish
        logs.push({
          id: `log_${dateStr}_${ex.id}`,
          exerciseId: ex.id,
          date: dateStr,
          completed: true,
          completedAt: '09:15'
        });
      }
    });
  }

  return logs;
};

export const initialLogs = generateInitialLogs();
