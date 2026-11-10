export function formatSum(amount) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
}

export function formatDollar(amount) {
  const num = Number(amount || 0);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
  return `$${formatted}`;
}

export function formatRate(rate) {
  const num = Number(rate || 0);
  return new Intl.NumberFormat("uz-UZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num) + " so'm";
}

export function formatCurrency(amount, currency = "UZS") {
  if (currency === "USD") {
    return formatDollar(amount);
  }
  return formatSum(amount);
}

export function formatDateTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return String(isoString);
  return date.toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * ISO string'ni O'zbekiston (+05:00) yoki ko'rsatilgan vaqt zonasi bilan formatlash
 * Masalan: 2026-10-05T15:40:00+05:00
 */
export function formatISOWithOffset(date = new Date(), offset = "+05:00") {
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, "0");

  if (typeof date === "string") {
    // Agar allaqachon timezone bilan bo'lsa
    if (/T\d{2}:\d{2}(:\d{2})?(\+\d{2}:\d{2}|-\d{2}:\d{2}|Z)$/.test(date)) {
      return date;
    }
    // Agar datetime-local input'dan kelsa: "2026-10-05T15:40"
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(date)) {
      const parts = date.split("T");
      const timePart = parts[1].length === 5 ? `${parts[1]}:00` : parts[1];
      return `${parts[0]}T${timePart}${offset}`;
    }
  }

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return formatISOWithOffset(now, offset);
  }

  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}${offset}`;
}

/**
 * HTML <input type="datetime-local"> uchun hozirgi yoki berilgan mahalliy vaqtni qaytarish (YYYY-MM-DDTHH:mm)
 */
export function toLocalDatetimeInput(date = new Date()) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

/**
 * HTML <input type="date"> uchun hozirgi yoki berilgan mahalliy sanani qaytarish (YYYY-MM-DD)
 */
export function toLocalDateInput(date = new Date()) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `${yyyy}-${MM}-${dd}`;
}

/**
 * Sanani o'zbekcha hafta kuni bilan ko'rsatish (masalan: "Dushanba, 5-oktabr 2026")
 */
export function formatDateWithWeekday(date = new Date()) {
  if (!date) return "";
  // Agar faqat YYYY-MM-DD formatida bo'lsa, vaqt o'tishi natijasida UTC orqaga ketmasligi uchun 12:00:00 qo'shamiz
  const d = date instanceof Date
    ? date
    : new Date(typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date);
  if (isNaN(d.getTime())) return "";

  const weekdays = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
  const months = [
    "yanvar", "fevral", "mart", "aprel", "may", "iyun",
    "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"
  ];

  const weekdayName = weekdays[d.getDay()];
  const day = d.getDate();
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();

  return `${weekdayName}, ${day}-${monthName} ${year}`;
}

/**
 * Faqat hafta kunini qaytarish (masalan: "Dushanba")
 */
export function formatWeekdayOnly(date = new Date()) {
  if (!date) return "";
  const d = date instanceof Date
    ? date
    : new Date(typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date);
  if (isNaN(d.getTime())) return "";
  const weekdays = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
  return weekdays[d.getDay()];
}

/**
 * Vaqtni qisqa ko'rinishda olish (masalan: "14:35")
 */
export function formatTimeShort(date = new Date()) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Tug'ilgan kundan yoshni va keyingi tug'ilgan kungacha bo'lgan kunlarni hisoblash
 */
export function calculateAgeAndNextBirthday(birthdayStr) {
  if (!birthdayStr) return null;
  const birthDate = new Date(birthdayStr);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  // Keyingi tug'ilgan kun
  const nextBday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (nextBday < today) {
    nextBday.setFullYear(today.getFullYear() + 1);
  }

  const diffTime = nextBday.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let daysText = "";
  if (daysLeft === 0 || (today.getDate() === birthDate.getDate() && today.getMonth() === birthDate.getMonth())) {
    daysText = "Bugun tug'ilgan kuni! 🎉";
  } else if (daysLeft === 1) {
    daysText = "Ertaga tug'ilgan kuni!";
  } else {
    daysText = `Tug'ilgan kuniga ${daysLeft} kun qoldi`;
  }

  return {
    age,
    daysLeft,
    daysText,
    formattedDate: birthDate.toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}

/**
 * Berilgan sanadan beri o'tgan vaqtni insoniy tilda hisoblash (masalan: yoqtira boshlagan vaqt)
 */
export function formatDurationSince(dateStr) {
  if (!dateStr) return "";
  const past = new Date(dateStr);
  if (isNaN(past.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - past.getTime();
  if (diffMs < 0) return "Yaqinda";

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (totalDays === 0) return "Bugun boshlandi";
  if (totalDays === 1) return "1 kun bo'ldi";
  if (totalDays < 30) return `${totalDays} kun bo'ldi`;

  const months = Math.floor(totalDays / 30.44);
  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  if (years > 0) {
    return remMonths > 0
      ? `${years} yil ${remMonths} oy (${totalDays} kun)`
      : `${years} yil (${totalDays} kun)`;
  }

  return `${months} oy (${totalDays} kun)`;
}

/**
 * Telegram va Instagram username'larini tozalash
 */
export function cleanSocialHandle(handle = "") {
  if (!handle) return "";
  return String(handle)
    .trim()
    .replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me|instagram\.com)\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "");
}


