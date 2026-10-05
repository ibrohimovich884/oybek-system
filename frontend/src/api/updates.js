/**
 * OYBEK SysteM - Updates & Complaints API Client
 */
import { apiClient } from "./client.js";

const STORAGE_UPDATES_KEY = "oybek_system:updates_cache_v1";
const STORAGE_UPDATES_META_KEY = "oybek_system:updates_meta_v1";
const STORAGE_COMPLAINTS_KEY = "oybek_system:complaints_cache_v1";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Default tizim yangilanishlari (oflayn yoki birinchi yuklanishda)
export const DEFAULT_SYSTEM_UPDATES = [
  {
    id: "upd_v5_2_0",
    version: "v5.2.0",
    title: "Tizim Yangilanishlari (Changelog) va Adminga Shikoyat Tizimi",
    category: "feature",
    badge: "Eng soʻnggi yangilik",
    summary: "Tizimning barcha yangilanishlarini qulay koʻrish, har bir yangilik yuzasidan adminga bevosita shikoyat, fikr yoki taklif yuborish imkoniyati qoʻshildi.",
    details: [
      { text: "Tizim yangilanishlari (Changelog) sahifasi: versiyalar tarixi va batafsil yangiliklar", type: "new" },
      { text: "Har bir yangilanish boʻyicha adminga toʻgʻridan-toʻgʻri shikoyat va taklif yuborish shakli", type: "new" },
      { text: "Admin paneli uchun maxsus 'Shikoyatlar & Fikrlar' boshqaruv moduli va holatni belgilash", type: "new" },
      { text: "Foydalanuvchilar oʻz yuborgan murojaatlari holatini va admin javobini kuzatish imkoni", type: "improved" },
      { text: "Oflayn rejimda ham xabarlarni xavfsiz saqlash va sinxronizatsiya kafolati", type: "fix" },
    ],
    release_date: "2026-10-04",
    is_pinned: true,
  },
  {
    id: "upd_v5_1_0",
    version: "v5.1.0",
    title: "Multi-User Tizimi, Admin Panel va CASCADE Tozalash",
    category: "security",
    badge: "Xavfsizlik & Multi-User",
    summary: "Koʻp foydalanuvchili arxitektura, Admin paneli, Bcrypt+Pepper xeshlash va foydalanuvchi oʻchirilganda maʼlumotlarni 100% tozalash.",
    details: [
      { text: "Har bir foydalanuvchi uchun toʻliq mustaqil hamyonlar, xarajatlar va qarzlar bazasi", type: "new" },
      { text: "Admin boshqaruv paneli: barcha foydalanuvchilarni koʻrish, parolni tiklash va bloklash", type: "new" },
      { text: "Bcrypt (10 raund) + HMAC-SHA256 Pepper maxfiy kalitli parollarni shifrlash", type: "security" },
      { text: "CASCADE xavfsiz tozalash: foydalanuvchi oʻchirilganda barcha tranzaksiyalari toʻliq yoʻqotiladi", type: "improved" },
    ],
    release_date: "2026-10-01",
    is_pinned: false,
  },
  {
    id: "upd_v5_0_0",
    version: "v5.0.0",
    title: "Markaziy Bank (CBU) Kursi va Zaxira Snapshot",
    category: "improvement",
    badge: "Avtomatlashtirish",
    summary: "Markaziy bankdan avtomatik USD kursi sinxronizatsiyasi va JSONB formatida toʻliq tizim zaxira nusxasi.",
    details: [
      { text: "Kunlik CBU rasmiy valyuta kursini avtomatik yangilash mexanizmi", type: "new" },
      { text: "App Snapshot: tizimning toʻliq zaxira nusxasini PostgreSQL JSONB da saqlash", type: "new" },
      { text: "Koʻp valyutali xarajatlarni oʻsha vaqtdagi kurs boʻyicha aniq hisoblash", type: "improved" },
    ],
    release_date: "2026-09-20",
    is_pinned: false,
  },
  {
    id: "upd_v4_8_0",
    version: "v4.8.0",
    title: "Qarz Daftari va Toʻlovlar Jurnali",
    category: "feature",
    badge: "Moliyaviy nazorat",
    summary: "Berilgan va olingan qarzlarni alohida nazorat qilish, qisman toʻlovlar jurnali va muddat eslatmalari.",
    details: [
      { text: "Olingan va berilgan qarzlarni qulay filtrlash va muddatini kuzatish", type: "new" },
      { text: "Qarz boʻyicha qisman toʻlovlarni qabul qilish va qoldiq summani hisoblash", type: "new" },
      { text: "Qarz yopilganda tanlangan hamyon balansiga pulni avtomatik qaytarish", type: "improved" },
    ],
    release_date: "2026-09-10",
    is_pinned: false,
  },
  {
    id: "upd_v4_5_0",
    version: "v4.5.0",
    title: "Money Manager & 7 ta Hamyon Arxitekturasi",
    category: "feature",
    badge: "Asosiy funksional",
    summary: "Naqd pul, karta, jamgʻarma va zaxira fondlari oʻrtasida tezkor universal oʻtkazmalar.",
    details: [
      { text: "7 ta asosiy va zaxira hamyonlar (Naqd pul, Karta, Jamgʻarma va boshqalar)", type: "new" },
      { text: "Hamyonlararo universal transfer (UZS <-> USD konvertatsiya bilan)", type: "new" },
      { text: "Kategoriya va oylar boʻyicha interaktiv diagrammalar", type: "improved" },
    ],
    release_date: "2026-08-25",
    is_pinned: false,
  },
  {
    id: "upd_v4_0_0",
    version: "v4.0.0",
    title: "Maxfiy PIN Kod va PWA Oflayn Qobiliyati",
    category: "security",
    badge: "Xavfsizlik",
    summary: "Control Panel uchun 4 xonali PIN kod qulfi va Progressive Web App (PWA) oflayn rejim.",
    details: [
      { text: "Control Panel va maxfiy maʼlumotlar uchun 4 xonali PIN kod muhofazasi", type: "security" },
      { text: "PWA texnologiyasi: ilovani telefonga va kompyuterga dastur kabi oʻrnatish", type: "new" },
      { text: "Internetsiz toʻliq ishlash va qayta ulanganda sinxronlash", type: "improved" },
    ],
    release_date: "2026-08-10",
    is_pinned: false,
  },
];

function getLocalComplaints() {
  try {
    const raw = localStorage.getItem(STORAGE_COMPLAINTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalComplaints(complaints) {
  try {
    localStorage.setItem(STORAGE_COMPLAINTS_KEY, JSON.stringify(complaints));
  } catch (e) {
    console.warn("Save local complaints error:", e);
  }
}

export function getLocalUpdates() {
  try {
    const raw = localStorage.getItem(STORAGE_UPDATES_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SYSTEM_UPDATES;
  } catch {
    return DEFAULT_SYSTEM_UPDATES;
  }
}

export function isUpdatesFresh() {
  try {
    const metaRaw = localStorage.getItem(STORAGE_UPDATES_META_KEY);
    if (!metaRaw) return false;
    const meta = JSON.parse(metaRaw);
    if (!meta.lastFetched) return false;
    const lastDate = new Date(meta.lastFetched);
    const now = new Date();
    const isSameDay = lastDate.getFullYear() === now.getFullYear() &&
                      lastDate.getMonth() === now.getMonth() &&
                      lastDate.getDate() === now.getDate();
    return isSameDay || (now.getTime() - lastDate.getTime() < ONE_DAY_MS);
  } catch {
    return false;
  }
}

function saveLocalUpdates(updates) {
  try {
    localStorage.setItem(STORAGE_UPDATES_KEY, JSON.stringify(updates));
    localStorage.setItem(STORAGE_UPDATES_META_KEY, JSON.stringify({ lastFetched: new Date().toISOString() }));
  } catch (e) {
    console.warn("Save local updates error:", e);
  }
}

export const updatesApi = {
  /**
   * Barcha yangilanishlarni olish (1 kunda 1 marta yangilanadi, fon rejimida)
   */
  async getUpdates(force = false) {
    const cached = getLocalUpdates();
    if (!force && isUpdatesFresh()) {
      return { ok: true, updates: cached, isRemote: false };
    }

    try {
      const res = await apiClient.get("/api/updates");
      if (res.ok && res.data?.updates && res.data.updates.length > 0) {
        saveLocalUpdates(res.data.updates);
        return { ok: true, updates: res.data.updates, isRemote: true };
      }
    } catch {
      // Backend mavjud bo'lmasa kesh qaytariladi
    }

    return { ok: true, updates: cached, isRemote: false };
  },

  /**
   * Adminga shikoyat / fikr yuborish
   */
  async submitComplaint(payload) {
    const res = await apiClient.post("/api/updates/complaints", payload);
    if (res.ok && res.data?.complaint) {
      // Local cachega ham qo'shib qo'yamiz
      const local = getLocalComplaints();
      local.unshift(res.data.complaint);
      saveLocalComplaints(local);

      return {
        ok: true,
        message: res.data.message || "Shikoyatingiz adminga yetkazildi!",
        complaint: res.data.complaint,
      };
    }

    // Oflayn fallback
    const id = `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newComplaint = {
      id,
      user_id: payload.userId || null,
      user_name: payload.contactName || "Foydalanuvchi",
      user_email: payload.contactEmail || "",
      user_phone: payload.contactPhone || null,
      update_id: payload.updateId || null,
      update_version: payload.updateVersion || null,
      update_title: payload.updateTitle || null,
      complaint_type: payload.complaintType || "complaint",
      priority: payload.priority || "normal",
      subject: payload.subject,
      message: payload.message,
      status: "pending",
      admin_notes: null,
      admin_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const local = getLocalComplaints();
    local.unshift(newComplaint);
    saveLocalComplaints(local);

    return {
      ok: true,
      message: "Shikoyatingiz qabul qilindi (Mahalliy xotiraga saqlandi va adminga koʻrsatiladi)",
      complaint: newComplaint,
    };
  },

  /**
   * Foydalanuvchining o'z murojaatlari
   */
  async getMyComplaints(currentUser) {
    const res = await apiClient.get("/api/updates/my-complaints");
    if (res.ok && res.data?.complaints) {
      return { ok: true, complaints: res.data.complaints };
    }

    // Oflayn fallback
    const local = getLocalComplaints();
    const userEmail = currentUser?.email;
    const userId = currentUser?.id;
    const filtered = local.filter((c) => c.user_id === userId || c.user_email === userEmail);
    return { ok: true, complaints: filtered };
  },

  /**
   * Admin: Barcha shikoyatlarni olish
   */
  async getAdminComplaints(params = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== "all") query.append("status", params.status);
    if (params.type && params.type !== "all") query.append("type", params.type);
    if (params.search) query.append("search", params.search);

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await apiClient.get(`/api/admin/complaints${qs}`);

    if (res.ok && res.data?.complaints) {
      return {
        ok: true,
        complaints: res.data.complaints,
        stats: res.data.stats || {},
      };
    }

    // Oflayn fallback
    const local = getLocalComplaints();
    let filtered = [...local];

    if (params.status && params.status !== "all") {
      filtered = filtered.filter((c) => c.status === params.status);
    }
    if (params.type && params.type !== "all") {
      filtered = filtered.filter((c) => c.complaint_type === params.type);
    }
    if (params.search && params.search.trim()) {
      const s = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          c.subject?.toLowerCase().includes(s) ||
          c.message?.toLowerCase().includes(s) ||
          c.user_name?.toLowerCase().includes(s) ||
          c.user_email?.toLowerCase().includes(s) ||
          c.update_version?.toLowerCase().includes(s)
      );
    }

    const stats = {
      total: local.length,
      pending: local.filter((c) => c.status === "pending").length,
      in_review: local.filter((c) => c.status === "in_review").length,
      resolved: local.filter((c) => c.status === "resolved").length,
      rejected: local.filter((c) => c.status === "rejected").length,
    };

    return {
      ok: true,
      complaints: filtered,
      stats,
    };
  },

  /**
   * Admin: Shikoyat holatini o'zgartirish va izoh yozish
   */
  async updateComplaintStatus(id, { status, adminNotes }) {
    const res = await apiClient.put(`/api/admin/complaints/${encodeURIComponent(id)}/status`, {
      status,
      adminNotes,
    });

    if (res.ok) {
      // Local cache yangilash
      const local = getLocalComplaints();
      const idx = local.findIndex((c) => c.id === id);
      if (idx !== -1) {
        local[idx].status = status || local[idx].status;
        local[idx].admin_notes = adminNotes !== undefined ? adminNotes : local[idx].admin_notes;
        local[idx].updated_at = new Date().toISOString();
        if (status === "resolved") {
          local[idx].resolved_at = new Date().toISOString();
        }
        saveLocalComplaints(local);
      }
      return { ok: true, message: res.data?.message || "Holat yangilandi" };
    }

    // Oflayn fallback
    const local = getLocalComplaints();
    const idx = local.findIndex((c) => c.id === id);
    if (idx !== -1) {
      local[idx].status = status || local[idx].status;
      local[idx].admin_notes = adminNotes !== undefined ? adminNotes : local[idx].admin_notes;
      local[idx].updated_at = new Date().toISOString();
      if (status === "resolved") {
        local[idx].resolved_at = new Date().toISOString();
      }
      saveLocalComplaints(local);
      return { ok: true, message: "Holat yangilandi (Mahalliy)" };
    }

    return { ok: false, error: res.error || "Holatni yangilab bo'lmadi" };
  },

  /**
   * Admin: Shikoyatni o'chirish
   */
  async deleteComplaint(id) {
    const res = await apiClient.delete(`/api/admin/complaints/${encodeURIComponent(id)}`);

    // Local keshdan ham olib tashlaymiz
    const local = getLocalComplaints().filter((c) => c.id !== id);
    saveLocalComplaints(local);

    if (res.ok) {
      return { ok: true, message: "Shikoyat o'chirildi" };
    }

    return { ok: true, message: "Shikoyat mahalliy xotiradan o'chirildi" };
  },

  /**
   * Admin: Yangi tizim yangilanishi e'lon qilish
   */
  async createUpdate(payload) {
    const res = await apiClient.post("/api/updates", payload);
    if (res.ok && res.data?.update) {
      const local = getLocalUpdates();
      local.unshift(res.data.update);
      saveLocalUpdates(local);
      return { ok: true, update: res.data.update, message: res.data.message };
    }

    // Oflayn fallback
    const newUpd = {
      id: `upd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      version: payload.version,
      title: payload.title,
      category: payload.category || "feature",
      badge: payload.badge || null,
      summary: payload.summary,
      details: payload.details || [],
      release_date: payload.releaseDate || new Date().toISOString().split("T")[0],
      is_pinned: Boolean(payload.isPinned),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const local = getLocalUpdates();
    local.unshift(newUpd);
    saveLocalUpdates(local);
    return { ok: true, update: newUpd, message: "Yangilanish mahalliy saqlandi" };
  },

  /**
   * Admin: Yangilanishni o'chirish
   */
  async deleteUpdate(id) {
    const res = await apiClient.delete(`/api/updates/${encodeURIComponent(id)}`);
    const local = getLocalUpdates().filter((u) => u.id !== id);
    saveLocalUpdates(local);
    return { ok: true, message: "Yangilanish o'chirildi" };
  },
};
