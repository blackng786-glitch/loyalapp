-- ================================================================
-- CHOPKAR — MIGRATION V5 : Bottle Keep (存酒) + Vouchers (储值券) + Feature 开关
-- 在 Supabase SQL Editor 执行一次 (可重复执行, 已做幂等保护)
-- ================================================================

-- 1. merchants 功能开关
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS feature_stamp   BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_bottle  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_voucher BOOLEAN DEFAULT false;

-- 2. 存酒主表
CREATE TABLE IF NOT EXISTS bottle_keeps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   UUID REFERENCES merchants(id) ON DELETE CASCADE,
  member_id     UUID REFERENCES members(id) ON DELETE CASCADE,
  brand         TEXT NOT NULL,
  size_ml       INTEGER NOT NULL,
  remaining_ml  INTEGER NOT NULL,
  photo_url     TEXT,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. 存酒流水记录
CREATE TABLE IF NOT EXISTS bottle_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bottle_keep_id  UUID REFERENCES bottle_keeps(id) ON DELETE CASCADE,
  type            TEXT CHECK (type IN ('deposit','pour','adjust','expired')),
  amount_ml       INTEGER NOT NULL,
  note            TEXT,
  staff_id        UUID,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 4. 储值券表
CREATE TABLE IF NOT EXISTS vouchers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   UUID REFERENCES merchants(id) ON DELETE CASCADE,
  member_id     UUID REFERENCES members(id) ON DELETE CASCADE,
  type          TEXT CHECK (type IN ('session','credit')) DEFAULT 'session',
  label         TEXT,
  total         NUMERIC NOT NULL,
  remaining     NUMERIC NOT NULL,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 5. 储值券流水
CREATE TABLE IF NOT EXISTS voucher_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id  UUID REFERENCES vouchers(id) ON DELETE CASCADE,
  type        TEXT CHECK (type IN ('issue','redeem','adjust')),
  amount      NUMERIC NOT NULL,
  note        TEXT,
  staff_id    UUID,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 索引 (查询会员存酒 / 商家全部 / 按到期排序)
CREATE INDEX IF NOT EXISTS idx_bottle_member   ON bottle_keeps(member_id);
CREATE INDEX IF NOT EXISTS idx_bottle_merchant ON bottle_keeps(merchant_id);
CREATE INDEX IF NOT EXISTS idx_bottle_expires  ON bottle_keeps(expires_at);
CREATE INDEX IF NOT EXISTS idx_btx_keep        ON bottle_transactions(bottle_keep_id);
CREATE INDEX IF NOT EXISTS idx_voucher_member  ON vouchers(member_id);
CREATE INDEX IF NOT EXISTS idx_voucher_merchant ON vouchers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_vtx_voucher     ON voucher_transactions(voucher_id);

-- 6. updated_at 触发器 (幂等: 先 DROP 再 CREATE)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bottle_keeps_updated ON bottle_keeps;
CREATE TRIGGER trg_bottle_keeps_updated
  BEFORE UPDATE ON bottle_keeps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. RLS (与现有表一致: 开启 RLS + open policy, 应用层 service key 鉴权)
ALTER TABLE bottle_keeps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS open_bottle_keeps        ON bottle_keeps;
DROP POLICY IF EXISTS open_bottle_transactions ON bottle_transactions;
DROP POLICY IF EXISTS open_vouchers            ON vouchers;
DROP POLICY IF EXISTS open_voucher_transactions ON voucher_transactions;
CREATE POLICY open_bottle_keeps        ON bottle_keeps         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY open_bottle_transactions ON bottle_transactions  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY open_vouchers            ON vouchers             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY open_voucher_transactions ON voucher_transactions FOR ALL USING (true) WITH CHECK (true);
