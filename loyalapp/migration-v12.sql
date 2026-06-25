-- migration-v12: Member tiers (spending-based + manual override + history)
-- Run in Supabase SQL Editor

-- Per-stamp amount spent (staff enters at stamp time)
ALTER TABLE stamps
  ADD COLUMN IF NOT EXISTS amount numeric NOT NULL DEFAULT 0;

-- Member tier state
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'Bronze',
  ADD COLUMN IF NOT EXISTS total_spent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier_updated_at timestamptz;

-- Merchant tier configuration (4 configurable slots: name + min spend) + feature flag
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS feature_tiers boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tier_config jsonb NOT NULL DEFAULT '[
    {"name":"Bronze","min":0},
    {"name":"Silver","min":500},
    {"name":"Gold","min":2000},
    {"name":"Platinum","min":5000}
  ]'::jsonb;

-- Audit trail: every tier change (auto upgrade or manual edit)
CREATE TABLE IF NOT EXISTS tier_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id) NOT NULL,
  member_id uuid REFERENCES members(id) NOT NULL,
  old_tier text,
  new_tier text NOT NULL,
  reason text NOT NULL DEFAULT 'auto',   -- 'auto' | 'manual'
  changed_by text,                        -- staff name / 'merchant' / 'system'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tier_history_member
  ON tier_history(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tier_history_merchant
  ON tier_history(merchant_id);
