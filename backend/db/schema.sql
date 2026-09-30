-- Oybek-system — money manager sxemasi (v3: haqiqiy frontend kontraktiga moslangan)

-- ===== Oddiy balanslar (Hamyon, Naqd, Karta, Dollar) =====
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,             -- 'hamyon' | 'naqd' | 'karta' | 'dollar'
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UZS',  -- 'UZS' | 'USD'
  balance NUMERIC NOT NULL DEFAULT 0
);

-- Eski (name/currency ustunlarisiz) yaratilgan "wallets" jadvali bo'lsa,
-- uni yangi sxemaga moslashtiradi — shu qatorlar bo'lmagani sababli
-- migratsiya "column name does not exist" xatosi bilan yiqilardi.
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'UZS';
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS balance NUMERIC NOT NULL DEFAULT 0;

INSERT INTO wallets (id, name, currency, balance) VALUES
  ('hamyon', 'Hamyon', 'UZS', 50000),
  ('naqd', 'Naqd pul', 'UZS', 30000),
  ('karta', 'Plastik karta', 'UZS', 100000),
  ('dollar', 'AQSH Dollari', 'USD', 0)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
  WHERE wallets.name = '';

-- ===== Tranzaksiyalar (xarajat / daromad / transfer) =====
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'expense',   -- expense | income | transfer
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UZS',
  category TEXT,
  subcategory TEXT,
  reason TEXT,
  location TEXT,
  payment_method TEXT,
  wallet TEXT,
  from_wallet TEXT,
  to_wallet TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  exchange_rate_at_time NUMERIC,
  spent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tahrir tarixi — har bir maydon uchun alohida qator (frontenddagi
-- trackedFields formatiga aynan mos: field/from/to/editedAt)
CREATE TABLE IF NOT EXISTS transaction_edits (
  id SERIAL PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Control Panel ma'lumotlari (Asosiy/rezerv, dollar tarixi, qarzlar) =====
-- Bu ma'lumotlarni frontend TO'LIQ o'zi (localStorage'da) boshqaradi va
-- faqat /api/backup orqali, o'zi belgilagan JSON shaklida, backendga
-- saqlash uchun yuboradi. Shuning uchun backend bu yerda shaklni
-- o'zgartirmasdan, aynan shu holicha saqlaydi (JSONB) — bu relatsion
-- jadvalga singdirishdan ko'ra ancha ishonchli, chunki frontend shakli
-- hali tez-tez o'zgarib turibdi.
CREATE TABLE IF NOT EXISTS app_snapshot (
  id INTEGER PRIMARY KEY DEFAULT 1,
  reserves JSONB NOT NULL DEFAULT '{}',
  dollar_rate_history JSONB NOT NULL DEFAULT '[]',
  pending_debts JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_snapshot_single_row CHECK (id = 1)
);

INSERT INTO app_snapshot (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- CBU kursi — backend tomonidan (masalan Render Cron Job orqali)
-- avtomatik kunlik yozib boriladigan alohida jurnal. Frontend hozircha
-- bevosita CBU.uz'ga o'zi ulanadi, bu jadval kelajakdagi cron sinxronizatsiyasi
-- va tarixiy statistikalar uchun.
CREATE TABLE IF NOT EXISTS cbu_rate_log (
  id SERIAL PRIMARY KEY,
  rate NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Mashqlar (exercise tracker) =====
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  target TEXT,
  duration_minutes INTEGER,
  calories INTEGER,
  icon TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS exercise_logs (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT true,
  completed_at TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  UNIQUE (exercise_id, date)
);

CREATE INDEX IF NOT EXISTS idx_transactions_spent_at ON transactions (spent_at DESC);
CREATE INDEX IF NOT EXISTS idx_edits_transaction_id ON transaction_edits (transaction_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise_id ON exercise_logs (exercise_id);
