-- migration-v8: Analytics optimization — aggregate stamp counts in DB instead of JS
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION stamp_counts_by_member(mid uuid)
RETURNS TABLE(member_id uuid, cnt bigint) AS $$
  SELECT member_id, count(*) AS cnt
  FROM stamps
  WHERE merchant_id = mid
  GROUP BY member_id;
$$ LANGUAGE sql STABLE;

-- Index to speed up the grouped count
CREATE INDEX IF NOT EXISTS idx_stamps_merchant_member
  ON stamps(merchant_id, member_id);

-- Index for member search (ilike on phone/name)
CREATE INDEX IF NOT EXISTS idx_members_merchant_phone
  ON members(merchant_id, phone);
