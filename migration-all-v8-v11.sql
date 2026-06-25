-- Combined migrations v8–v11 (idempotent, safe to run together)
-- Run once in Supabase SQL Editor

-- ── migration-v8: Analytics optimization ──────────────────────
CREATE OR REPLACE FUNCTION stamp_counts_by_member(mid uuid)
RETURNS TABLE(member_id uuid, cnt bigint) AS $$
  SELECT member_id, count(*) AS cnt
  FROM stamps
  WHERE merchant_id = mid
  GROUP BY member_id;
$$ LANGUAGE sql STABLE;

CREATE INDEX IF NOT EXISTS idx_stamps_merchant_member
  ON stamps(merchant_id, member_id);
CREATE INDEX IF NOT EXISTS idx_members_merchant_phone
  ON members(merchant_id, phone);

-- ── migration-v9: Pro plan + SMS quota ────────────────────────
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

CREATE TABLE IF NOT EXISTS sms_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id) NOT NULL,
  month text NOT NULL,
  count int NOT NULL DEFAULT 0,
  UNIQUE(merchant_id, month)
);

CREATE INDEX IF NOT EXISTS idx_sms_usage_merchant_month
  ON sms_usage(merchant_id, month);

-- ── migration-v10: Birthday + auto campaigns ──────────────────
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS birthday text;

CREATE TABLE IF NOT EXISTS auto_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id) NOT NULL,
  type text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  title text NOT NULL,
  body text NOT NULL,
  days_offset int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(merchant_id, type)
);

CREATE INDEX IF NOT EXISTS idx_members_birthday
  ON members(merchant_id, birthday);

-- ── migration-v11: Referral program ───────────────────────────
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS feature_referral boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_bonus_referrer int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS referral_bonus_referee int NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id) NOT NULL,
  referrer_id uuid REFERENCES members(id) NOT NULL,
  referee_id uuid REFERENCES members(id) NOT NULL,
  referrer_bonus int NOT NULL DEFAULT 0,
  referee_bonus int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer
  ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_merchant
  ON referrals(merchant_id);
CREATE INDEX IF NOT EXISTS idx_members_referral_code
  ON members(referral_code) WHERE referral_code IS NOT NULL;
