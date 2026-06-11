-- ================================================================
-- CHOPKAR — MIGRATION V6 : 关闭数据库公开访问 (安全加固)
-- 在 Supabase SQL Editor 执行一次 (可重复执行)
--
-- 背景: 之前所有表的 RLS policy 都是 USING (true)，意味着任何人
-- 拿前端页面里的 anon key 就能直接读写整个数据库（绕过 server.js）。
-- 本迁移删除所有开放策略。RLS 保持启用 = 默认拒绝 anon 访问。
-- server.js 用 service key 操作数据库，不受 RLS 限制，功能不变。
-- dashboard 的 Supabase Auth 登录（auth.users）不受表策略影响。
-- ================================================================

DROP POLICY IF EXISTS "open_merchants"            ON public.merchants;
DROP POLICY IF EXISTS "open_staff"                ON public.staff;
DROP POLICY IF EXISTS "open_members"              ON public.members;
DROP POLICY IF EXISTS "open_stamps"               ON public.stamps;
DROP POLICY IF EXISTS "open_redemptions"          ON public.redemptions;
DROP POLICY IF EXISTS "open_push"                 ON public.push_subscriptions;
DROP POLICY IF EXISTS "open_sched"                ON public.scheduled_pushes;
DROP POLICY IF EXISTS "open_branches"             ON public.branches;
DROP POLICY IF EXISTS "open_bottle_keeps"         ON public.bottle_keeps;
DROP POLICY IF EXISTS "open_bottle_transactions"  ON public.bottle_transactions;
DROP POLICY IF EXISTS "open_vouchers"             ON public.vouchers;
DROP POLICY IF EXISTS "open_voucher_transactions" ON public.voucher_transactions;

-- 确保 RLS 全部启用 (幂等)
ALTER TABLE public.merchants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamps               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_pushes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottle_keeps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottle_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_transactions ENABLE ROW LEVEL SECURITY;
