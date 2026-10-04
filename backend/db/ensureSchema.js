import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Backend kutadigan ustunlar (information_schema.data_type qiymatlari bilan)
export const EXPECTED = {
  users: {
    id: "text",
    email: "text",
    username: "text",
    phone_number: "text",
    password_hash: "text",
    full_name: "text",
    avatar_url: "text",
    role: "text",
    is_active: "boolean",
    default_currency: "text",
    language: "text",
    theme: "text",
    timezone: "text",
    last_login_at: "timestamp with time zone",
    created_at: "timestamp with time zone",
    updated_at: "timestamp with time zone",
  },
  wallets: {
    id: "text",
    user_id: "text",
    name: "text",
    currency: "text",
    balance: "numeric",
    parent_id: "text",
  },
  wallet_notes: {
    id: "integer",
    wallet_id: "text",
    user_id: "text",
    text: "text",
    amount_at_time: "numeric",
    edited_at: "timestamp with time zone",
  },
  transactions: {
    id: "text",
    user_id: "text",
    type: "text",
    amount: "numeric",
    currency: "text",
    category: "text",
    subcategory: "text",
    reason: "text",
    location: "text",
    payment_method: "text",
    wallet: "text",
    from_wallet: "text",
    to_wallet: "text",
    quantity: "integer",
    exchange_rate_at_time: "numeric",
    spent_at: "timestamp with time zone",
    created_at: "timestamp with time zone",
  },
  transaction_edits: {
    id: "integer",
    transaction_id: "text",
    user_id: "text",
    field: "text",
    from_value: "text",
    to_value: "text",
    edited_at: "timestamp with time zone",
  },
  debts: {
    id: "text",
    user_id: "text",
    type: "text",
    person_name: "text",
    contact: "text",
    amount: "numeric",
    currency: "text",
    reason: "text",
    location: "text",
    personal_note: "text",
    wallet: "text",
    status: "text",
    due_date: "date",
    is_due_date_unknown: "boolean",
    affect_balance: "boolean",
    synced: "boolean",
    debt_date: "timestamp with time zone",
    created_at: "timestamp with time zone",
    updated_at: "timestamp with time zone",
  },
  debt_payments: {
    id: "text",
    debt_id: "text",
    user_id: "text",
    amount: "numeric",
    note: "text",
    paid_at: "timestamp with time zone",
  },
  app_snapshot: {
    id: "text",
    user_id: "text",
    reserves: "jsonb",
    dollar_rate_history: "jsonb",
    pending_debts: "jsonb",
    updated_at: "timestamp with time zone",
  },
  cbu_rate_log: {
    id: "integer",
    rate: "numeric",
    recorded_at: "timestamp with time zone",
  },
  exercises: {
    id: "text",
    user_id: "text",
    name: "text",
    category: "text",
    target: "text",
    duration_minutes: "integer",
    calories: "integer",
    icon: "text",
    created_at: "text",
  },
  exercise_logs: {
    id: "text",
    exercise_id: "text",
    user_id: "text",
    date: "text",
    completed: "boolean",
    completed_at: "text",
    details: "jsonb",
  },
  system_updates: {
    id: "text",
    version: "text",
    title: "text",
    category: "text",
    badge: "text",
    summary: "text",
    details: "jsonb",
    release_date: "date",
    is_pinned: "boolean",
    created_at: "timestamp with time zone",
    updated_at: "timestamp with time zone",
  },
  update_complaints: {
    id: "text",
    user_id: "text",
    user_name: "text",
    user_email: "text",
    user_phone: "text",
    update_id: "text",
    update_version: "text",
    update_title: "text",
    complaint_type: "text",
    priority: "text",
    subject: "text",
    message: "text",
    status: "text",
    admin_notes: "text",
    admin_id: "text",
    resolved_at: "timestamp with time zone",
    created_at: "timestamp with time zone",
    updated_at: "timestamp with time zone",
  },
};

const DEFAULTS = {
  "users.role": "'user'",
  "users.is_active": "true",
  "users.default_currency": "'UZS'",
  "users.language": "'uz'",
  "users.theme": "'dark'",
  "users.timezone": "'Asia/Tashkent'",
  "users.created_at": "now()",
  "users.updated_at": "now()",
  "wallets.name": "''",
  "wallets.currency": "'UZS'",
  "wallets.balance": "0",
  "wallet_notes.edited_at": "now()",
  "transactions.type": "'expense'",
  "transactions.currency": "'UZS'",
  "transactions.quantity": "1",
  "transactions.created_at": "now()",
  "transaction_edits.edited_at": "now()",
  "debts.currency": "'UZS'",
  "debts.status": "'pending'",
  "debts.is_due_date_unknown": "false",
  "debts.affect_balance": "false",
  "debts.synced": "true",
  "debts.created_at": "now()",
  "debts.updated_at": "now()",
  "debt_payments.paid_at": "now()",
  "app_snapshot.reserves": "'{}'::jsonb",
  "app_snapshot.dollar_rate_history": "'[]'::jsonb",
  "app_snapshot.pending_debts": "'[]'::jsonb",
  "app_snapshot.updated_at": "now()",
  "cbu_rate_log.recorded_at": "now()",
  "exercise_logs.completed": "true",
  "exercise_logs.details": "'{}'::jsonb",
  "system_updates.category": "'feature'",
  "system_updates.details": "'[]'::jsonb",
  "system_updates.release_date": "CURRENT_DATE",
  "system_updates.is_pinned": "false",
  "system_updates.created_at": "now()",
  "system_updates.updated_at": "now()",
  "update_complaints.complaint_type": "'complaint'",
  "update_complaints.priority": "'normal'",
  "update_complaints.status": "'pending'",
  "update_complaints.created_at": "now()",
  "update_complaints.updated_at": "now()",
};

// Bir guruh jadvallar: birinchisi "ota", qolganlari unga bog'liq.
const GROUPS = [
  ["transaction_edits", "transactions"],
  ["debt_payments", "debts"],
  ["wallet_notes", "wallets"],
  ["exercise_logs", "exercises"],
];

async function getColumns(table) {
  const { rows } = await pool.query(
    `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return rows;
}

function problemsOf(table, cols) {
  const byName = new Map(cols.map((c) => [c.column_name, c]));
  const problems = [];
  for (const [name, type] of Object.entries(EXPECTED[table])) {
    const c = byName.get(name);
    if (!c) problems.push({ table, column: name, kind: "missing", expected: type });
    else if (c.data_type !== type) {
      problems.push({ table, column: name, kind: "type", expected: type, actual: c.data_type });
    }
  }
  return problems;
}

/** Sxemadagi muammolarni topadi (o'zgartirmaydi). /api/health va doctor ishlatadi. */
export async function checkSchema() {
  const problems = [];
  for (const table of Object.keys(EXPECTED)) {
    const cols = await getColumns(table);
    if (cols.length === 0) problems.push({ table, kind: "no-table" });
    else problems.push(...problemsOf(table, cols));
  }
  return { ok: problems.length === 0, problems };
}

/**
 * Eski versiyalarda yaratilgan jadvallar `CREATE TABLE IF NOT EXISTS` tufayli
 * yangilanmasdi — shu sababli INSERT'lar "column ... does not exist" yoki
 * "invalid input syntax" bilan yiqilardi (faqat `wallets` ALTER bilan tuzatilgan edi).
 *
 * - Jadval BO'SH va sxema noto'g'ri bo'lsa -> o'chirib, to'g'ri qayta yaratadi.
 * - Jadvalda ma'lumot BOR bo'lsa -> yetishmagan ustunlarni qo'shadi va ortiqcha
 *   NOT NULL ustunlardan majburiyatni oladi; tur mos kelmasa faqat ogohlantiradi.
 */
export async function ensureSchema() {
  const log = [];

  for (const group of GROUPS) {
    const groupProblems = [];
    for (const t of group) {
      const cols = await getColumns(t);
      if (cols.length) groupProblems.push(...problemsOf(t, cols));
    }
    if (groupProblems.length === 0) continue;

    let total = 0;
    for (const t of group) {
      if ((await getColumns(t)).length) {
        const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
        total += rows[0].n;
      }
    }
    if (total === 0) {
      for (const t of group) await pool.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
      log.push(`Bo'sh va eskirgan jadvallar qayta yaratiladi: ${group.join(", ")}`);
    }
  }

  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  let firstError = null;
  try {
    await pool.query(sql);
  } catch (err) {
    // Eski jadval ustunlari yetishmasa indeks/insert yiqilishi mumkin — pastda ta'mirlab, qayta urinamiz
    firstError = err.message;
    log.push(`schema.sql birinchi urinishda xato berdi (${err.message}), ta'mirlanmoqda...`);
    // Yetishmagan jadvallarni yaratib olish uchun CREATE TABLE qismlarini alohida ishlatamiz
    for (const stmt of sql.split(/;\s*\n/).filter((x) => /CREATE TABLE/i.test(x))) {
      await pool.query(stmt).catch(() => {});
    }
  }

  // Ma'lumotli eski jadvallarni ta'mirlash
  for (const table of Object.keys(EXPECTED)) {
    const cols = await getColumns(table);
    for (const p of problemsOf(table, cols)) {
      if (p.kind === "missing") {
        const def = DEFAULTS[`${table}.${p.column}`];
        await pool.query(
          `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${p.column} ${p.expected}${def ? ` DEFAULT ${def}` : ""}`
        );
        log.push(`${table}.${p.column} ustuni qo'shildi`);
      } else {
        log.push(
          `OGOHLANTIRISH: ${table}.${p.column} turi ${p.actual}, kutilgani ${p.expected} — qo'lda tuzatish kerak`
        );
      }
    }
    // Bizning kodimiz bilmaydigan majburiy (NOT NULL, default'siz) eski ustunlar INSERT'ni buzadi
    for (const c of await getColumns(table)) {
      if (!(c.column_name in EXPECTED[table]) && c.is_nullable === "NO" && !c.column_default) {
        await pool.query(`ALTER TABLE ${table} ALTER COLUMN "${c.column_name}" DROP NOT NULL`);
        log.push(`${table}.${c.column_name} dan NOT NULL olib tashlandi`);
      }
    }
  }

  if (firstError) await pool.query(sql); // ta'mirdan keyin to'liq qayta ishga tushiramiz

  // ON CONFLICT (...) ishlashi uchun unique indekslar
  const indexes = [
    "CREATE UNIQUE INDEX IF NOT EXISTS transactions_id_uq ON transactions (id)",
    "CREATE UNIQUE INDEX IF NOT EXISTS exercises_id_uq ON exercises (id)",
    "CREATE UNIQUE INDEX IF NOT EXISTS exercise_logs_ex_date_uq ON exercise_logs (exercise_id, date)",
  ];
  for (const stmt of indexes) {
    try {
      await pool.query(stmt);
    } catch (err) {
      log.push(`Indeks yaratilmadi (${err.message})`);
    }
  }

  // Admin foydalanuvchisini bazada mavjudligini ta'minlash (Login: Admin, Parol: Oybe-SysteM)
  try {
    const { hashPassword } = await import("../src/utils/security.js");
    const adminHash = await hashPassword("Oybe-SysteM");
    await pool.query(
      `INSERT INTO users (id, email, username, full_name, password_hash, role, is_active)
       VALUES ('usr_admin', 'admin@system.local', 'admin', 'Admin (Oybek SysteM)', $1, 'admin', true)
       ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true`,
      [adminHash]
    );
    log.push("Admin foydalanuvchisi (Login: Admin) tekshirildi/saqlandi");
  } catch (err) {
    log.push(`Admin hisobini tekshirishda ogohlantirish: ${err.message}`);
  }

  // Tizim yangilanishlarini (system_updates) boshlang'ich ma'lumotlar bilan to'ldirish
  try {
    const countRes = await pool.query(`SELECT COUNT(*)::int AS count FROM system_updates`);
    if (countRes.rows[0]?.count === 0) {
      const defaultUpdates = [
        {
          id: "upd_v5_2_0",
          version: "v5.2.0",
          title: "Tizim Yangilanishlari (Changelog) va Adminga Shikoyat Tizimi",
          category: "feature",
          badge: "Eng soʻnggi yangilik",
          summary: "Tizimning barcha yangilanishlarini qulay koʻrish, har bir yangilik yuzasidan adminga bevosita shikoyat, fikr yoki taklif yuborish imkoniyati qoʻshildi.",
          details: JSON.stringify([
            { text: "Tizim yangilanishlari (Changelog) sahifasi: versiyalar tarixi va batafsil yangiliklar", type: "new" },
            { text: "Har bir yangilanish boʻyicha adminga toʻgʻridan-toʻgʻri shikoyat va taklif yuborish shakli", type: "new" },
            { text: "Admin paneli uchun maxsus 'Shikoyatlar & Fikrlar' boshqaruv moduli va holatni belgilash", type: "new" },
            { text: "Foydalanuvchilar oʻz yuborgan murojaatlari holatini va admin javobini kuzatish imkoni", type: "improved" },
            { text: "Oflayn rejimda ham xabarlarni xavfsiz saqlash va sinxronizatsiya kafolati", type: "fix" }
          ]),
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
          details: JSON.stringify([
            { text: "Har bir foydalanuvchi uchun toʻliq mustaqil hamyonlar, xarajatlar va qarzlar bazasi", type: "new" },
            { text: "Admin boshqaruv paneli: barcha foydalanuvchilarni koʻrish, parolni tiklash va bloklash", type: "new" },
            { text: "Bcrypt (10 raund) + HMAC-SHA256 Pepper maxfiy kalitli parollarni shifrlash", type: "security" },
            { text: "CASCADE xavfsiz tozalash: foydalanuvchi oʻchirilganda barcha tranzaksiyalari toʻliq yoʻqotiladi", type: "improved" }
          ]),
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
          details: JSON.stringify([
            { text: "Kunlik CBU rasmiy valyuta kursini avtomatik yangilash mexanizmi", type: "new" },
            { text: "App Snapshot: tizimning toʻliq zaxira nusxasini PostgreSQL JSONB da saqlash", type: "new" },
            { text: "Koʻp valyutali xarajatlarni oʻsha vaqtdagi kurs boʻyicha aniq hisoblash", type: "improved" }
          ]),
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
          details: JSON.stringify([
            { text: "Olingan va berilgan qarzlarni qulay filtrlash va muddatini kuzatish", type: "new" },
            { text: "Qarz boʻyicha qisman toʻlovlarni qabul qilish va qoldiq summani hisoblash", type: "new" },
            { text: "Qarz yopilganda tanlangan hamyon balansiga pulni avtomatik qaytarish", type: "improved" }
          ]),
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
          details: JSON.stringify([
            { text: "7 ta asosiy va zaxira hamyonlar (Naqd pul, Karta, Jamgʻarma va boshqalar)", type: "new" },
            { text: "Hamyonlararo universal transfer (UZS <-> USD konvertatsiya bilan)", type: "new" },
            { text: "Kategoriya va oylar boʻyicha interaktiv diagrammalar", type: "improved" }
          ]),
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
          details: JSON.stringify([
            { text: "Control Panel va maxfiy maʼlumotlar uchun 4 xonali PIN kod muhofazasi", type: "security" },
            { text: "PWA texnologiyasi: ilovani telefonga va kompyuterga dastur kabi oʻrnatish", type: "new" },
            { text: "Internetsiz toʻliq ishlash va qayta ulanganda sinxronlash", type: "improved" }
          ]),
          release_date: "2026-08-10",
          is_pinned: false,
        }
      ];

      for (const u of defaultUpdates) {
        await pool.query(
          `INSERT INTO system_updates (id, version, title, category, badge, summary, details, release_date, is_pinned)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [u.id, u.version, u.title, u.category, u.badge, u.summary, u.details, u.release_date, u.is_pinned]
        );
      }
      log.push("Boshlang'ich tizim yangilanishlari (system_updates) yuklandi");
    }
  } catch (err) {
    log.push(`Tizim yangilanishlarini kiritishda ogohlantirish: ${err.message}`);
  }

  const status = await checkSchema();
  return { log, status };
}
