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
 * Masalan: 2026-09-20T13:40:00+05:00
 */
export function formatISOWithOffset(date = new Date(), offset = "+05:00") {
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, "0");

  if (typeof date === "string") {
    // Agar allaqachon timezone bilan bo'lsa
    if (/T\d{2}:\d{2}(:\d{2})?(\+\d{2}:\d{2}|-\d{2}:\d{2}|Z)$/.test(date)) {
      return date;
    }
    // Agar datetime-local input'dan kelsa: "2026-09-20T13:40"
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

export function toLocalDatetimeInput(date) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

