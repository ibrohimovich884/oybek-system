-- Oybek-system — money manager sxemasi (v5: Multi-User)
-- Bu fayl qayta-qayta ishga tushirilsa ham buzilmaydi (idempotent).

-- ===== Foydalanuvchilar (Multi-User) =====
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,               -- Asosiy identifikator (Gmail)
  username TEXT UNIQUE,                     -- Zaxira identifikator
  phone_number TEXT,                        -- Zaxira telefon raqam
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',        -- 'admin' | 'user'
  is_active BOOLEAN NOT NULL DEFAULT true,
  default_currency TEXT NOT NULL DEFAULT 'UZS',
  language TEXT NOT NULL DEFAULT 'uz',
  theme TEXT NOT NULL DEFAULT 'dark',
  timezone TEXT NOT NULL DEFAULT 'Asia/Tashkent',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users (phone_number);

-- ===== Hamyonlar (oddiy + zaxira) =====
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UZS',
  balance NUMERIC NOT NULL DEFAULT 0,
  parent_id TEXT
);

ALTER TABLE wallets ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'UZS';
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS balance NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS parent_id TEXT;

-- ===== Tranzaksiyalar (xarajat / daromad / transfer) =====
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT NOT NULL DEFAULT 'expense',
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

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Tahrir tarixi
CREATE TABLE IF NOT EXISTS transaction_edits (
  id SERIAL PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id TEXT,
  field TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transaction_edits ADD COLUMN IF NOT EXISTS user_id TEXT;

-- ===== Hamyon izohlari =====
CREATE TABLE IF NOT EXISTS wallet_notes (
  id SERIAL PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  user_id TEXT,
  text TEXT NOT NULL,
  amount_at_time NUMERIC,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE wallet_notes ADD COLUMN IF NOT EXISTS user_id TEXT;

-- ===== Qarzlar (Kutilayotgan pullar) =====
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT NOT NULL,                      -- 'taken' (olingan) | 'given' (berilgan)
  person_name TEXT,
  contact TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UZS',
  reason TEXT,
  location TEXT,
  personal_note TEXT,
  wallet TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  is_due_date_unknown BOOLEAN NOT NULL DEFAULT false,
  affect_balance BOOLEAN NOT NULL DEFAULT false,
  synced BOOLEAN NOT NULL DEFAULT true,
  debt_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE debts ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  user_id TEXT,
  amount NUMERIC NOT NULL,
  note TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE debt_payments ADD COLUMN IF NOT EXISTS user_id TEXT;

-- ===== Zaxira nusxa (Snapshot) =====
CREATE TABLE IF NOT EXISTS app_snapshot (
  id TEXT PRIMARY KEY DEFAULT '1',
  user_id TEXT,
  reserves JSONB NOT NULL DEFAULT '{}',
  dollar_rate_history JSONB NOT NULL DEFAULT '[]',
  pending_debts JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_snapshot ADD COLUMN IF NOT EXISTS user_id TEXT;

-- CBU kursi — kunlik jurnal
CREATE TABLE IF NOT EXISTS cbu_rate_log (
  id SERIAL PRIMARY KEY,
  rate NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Mashqlar (exercise tracker) =====
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  category TEXT,
  target TEXT,
  duration_minutes INTEGER,
  calories INTEGER,
  icon TEXT,
  created_at TEXT
);

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE TABLE IF NOT EXISTS exercise_logs (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL,
  user_id TEXT,
  date TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT true,
  completed_at TEXT,
  details JSONB NOT NULL DEFAULT '{}'
);

ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS user_id TEXT;

-- ===== Indekslar =====
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_spent_at ON transactions (spent_at DESC);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts (user_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts (status);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments (debt_id);
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises (user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_id ON exercise_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise_id ON exercise_logs (exercise_id);
CREATE INDEX IF NOT EXISTS idx_app_snapshot_user_id ON app_snapshot (user_id);
