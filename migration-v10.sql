-- migration-v10: Birthday field + auto campaign settings
-- Run in Supabase SQL Editor

-- Birthday on members (month-day only, e.g. '06-19')
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS birthday text;

-- Auto campaign settings per merchant
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
