-- Oybek-system — money manager sxemasi (v4: Variant B)
-- Bu fayl qayta-qayta ishga tushirilsa ham buzilmaydi (idempotent).

-- ===== Hamyonlar (oddiy + zaxira) =====
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,             -- 'hamyon' | 'naqd' | 'karta' | 'dollar' | 'naqd_reserve' | 'karta_reserve' | 'dollar_reserve'
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UZS',  -- 'UZS' | 'USD'
  balance NUMERIC NOT NULL DEFAULT 0
);

-- Eski "wallets" jadvali bo'lsa, uni yangi sxemaga moslashtiradi
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'UZS';
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS balance NUMERIC NOT NULL DEFAULT 0;

-- Zaxira hamyonlar uchun: qaysi oddiy hamyonning zaxirasi ekanini ko'rsatadi
-- (oddiy hamyonlarda NULL)
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES wallets(id);

-- Valyuta faqat UZS yoki USD bo'lishi mumkin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_currency_check') THEN
    ALTER TABLE wallets
      ADD CONSTRAINT wallets_currency_check CHECK (currency IN ('UZS', 'USD'));
  END IF;
END $$;

-- Oddiy hamyonlar
INSERT INTO wallets (id, name, currency, balance) VALUES
  ('hamyon', 'Hamyon', 'UZS', 50000),
  ('naqd', 'Naqd pul', 'UZS', 30000),
  ('karta', 'Plastik karta', 'UZS', 100000),
  ('dollar', 'AQSH Dollari', 'USD', 0)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, currency = EXCLUDED.currency
  WHERE wallets.name = '';

-- Zaxira hamyonlar (balansga tegmaydi, faqat nom/valyuta/parent_id ni to'g'rilaydi)
INSERT INTO wallets (id, name, currency, balance, parent_id) VALUES
  ('naqd_reserve',   'Naqd zaxira',   'UZS', 0, 'naqd'),
  ('karta_reserve',  'Karta zaxira',  'UZS', 0, 'karta'),
  ('dollar_reserve', 'Dollar zaxira', 'USD', 0, 'dollar')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  currency = EXCLUDED.currency,
  parent_id = EXCLUDED.parent_id;

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

-- Eski frontend zaxira id'lari ('naqd-asosiy' ...) yangi id'larga almashtiriladi
UPDATE transactions SET
  wallet = CASE wallet
    WHEN 'naqd-asosiy'   THEN 'naqd_reserve'
    WHEN 'karta-asosiy'  THEN 'karta_reserve'
    WHEN 'dollar-asosiy' THEN 'dollar_reserve'
    ELSE wallet END,
  from_wallet = CASE from_wallet
    WHEN 'naqd-asosiy'   THEN 'naqd_reserve'
    WHEN 'karta-asosiy'  THEN 'karta_reserve'
    WHEN 'dollar-asosiy' THEN 'dollar_reserve'
    ELSE from_wallet END,
  to_wallet = CASE to_wallet
    WHEN 'naqd-asosiy'   THEN 'naqd_reserve'
    WHEN 'karta-asosiy'  THEN 'karta_reserve'
    WHEN 'dollar-asosiy' THEN 'dollar_reserve'
    ELSE to_wallet END
WHERE wallet      IN ('naqd-asosiy', 'karta-asosiy', 'dollar-asosiy')
   OR from_wallet IN ('naqd-asosiy', 'karta-asosiy', 'dollar-asosiy')
   OR to_wallet   IN ('naqd-asosiy', 'karta-asosiy', 'dollar-asosiy');

-- Bog'lanishlar va tekshiruvlar.
-- NOT VALID: eski qatorlar tekshirilmaydi, lekin yangi/o'zgargan qatorlar tekshiriladi.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_wallet_fk') THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_wallet_fk
      FOREIGN KEY (wallet) REFERENCES wallets(id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_from_wallet_fk') THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_from_wallet_fk
      FOREIGN KEY (from_wallet) REFERENCES wallets(id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_to_wallet_fk') THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_to_wallet_fk
      FOREIGN KEY (to_wallet) REFERENCES wallets(id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_type_check') THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
      CHECK (type IN ('expense', 'income', 'transfer')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_amount_check') THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_amount_check
      CHECK (amount > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_transfer_check') THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_transfer_check
      CHECK (type <> 'transfer' OR (from_wallet IS NOT NULL AND to_wallet IS NOT NULL AND from_wallet <> to_wallet)) NOT VALID;
  END IF;
END $$;

-- Tahrir tarixi — har bir maydon uchun alohida qator
CREATE TABLE IF NOT EXISTS transaction_edits (
  id SERIAL PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Hamyon izohlari (qo'lda yozilgan izohlar, masalan "Dastlabki balans shakllantirildi") =====
-- O'tkazmalar bu yerga yozilmaydi — ular transactions da turadi.
CREATE TABLE IF NOT EXISTS wallet_notes (
  id SERIAL PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  amount_at_time NUMERIC,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wallet_id, edited_at)
);

-- ===== Qarzlar (Kutilayotgan pullar) =====
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                      -- 'taken' (olingan) | 'given' (berilgan)
  person_name TEXT,
  contact TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UZS',
  reason TEXT,
  location TEXT,
  personal_note TEXT,
  wallet TEXT REFERENCES wallets(id),
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  is_due_date_unknown BOOLEAN NOT NULL DEFAULT false,
  affect_balance BOOLEAN NOT NULL DEFAULT false,
  synced BOOLEAN NOT NULL DEFAULT true,
  debt_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  note TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Zaxira nusxa (eski) =====
-- Variant B dan keyin reserves / pending_debts / dollar_rate_history ma'lumotlari
-- wallets, wallet_notes, debts, transactions ga ko'chadi.
-- Jadval o'chirilmaydi: frontend hozircha /api/backup orqali yuborishda davom etishi mumkin.
CREATE TABLE IF NOT EXISTS app_snapshot (
  id INTEGER PRIMARY KEY DEFAULT 1,
  reserves JSONB NOT NULL DEFAULT '{}',
  dollar_rate_history JSONB NOT NULL DEFAULT '[]',
  pending_debts JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_snapshot_single_row CHECK (id = 1)
);

INSERT INTO app_snapshot (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- CBU kursi — kunlik jurnal (Render Cron Job uchun)
CREATE TABLE IF NOT EXISTS cbu_rate_log (
  id SERIAL PRIMARY KEY,
  rate NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Mashqlar (exercise tracker) — hozircha bo'sh, kelajakda quriladi =====
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

-- ===== Indekslar =====
CREATE INDEX IF NOT EXISTS idx_transactions_spent_at ON transactions (spent_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions (wallet);
CREATE INDEX IF NOT EXISTS idx_transactions_from_wallet ON transactions (from_wallet);
CREATE INDEX IF NOT EXISTS idx_transactions_to_wallet ON transactions (to_wallet);
CREATE INDEX IF NOT EXISTS idx_edits_transaction_id ON transaction_edits (transaction_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts (status);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments (debt_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise_id ON exercise_logs (exercise_id);
