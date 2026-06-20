-- migration-v11: Referral program
-- Run in Supabase SQL Editor

-- Referral code on members
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Referral settings on merchants
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS feature_referral boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_bonus_referrer int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS referral_bonus_referee int NOT NULL DEFAULT 1;

-- Referral tracking
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
