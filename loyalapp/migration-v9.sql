-- migration-v9: Pro plan + SMS quota
-- Run in Supabase SQL Editor

-- Pro plan fields on merchants
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

-- SMS usage tracking (monthly quota)
CREATE TABLE IF NOT EXISTS sms_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id) NOT NULL,
  month text NOT NULL,
  count int NOT NULL DEFAULT 0,
  UNIQUE(merchant_id, month)
);

-- Index for fast quota lookup
CREATE INDEX IF NOT EXISTS idx_sms_usage_merchant_month
  ON sms_usage(merchant_id, month);
