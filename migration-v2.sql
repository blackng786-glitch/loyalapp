-- ================================================================
-- LOYALAPP — MIGRATION V2
-- 新增: 定时/自动化推送 + 多门店管理
-- 在 Supabase SQL Editor 中执行一次即可 (可重复执行, 已用 if not exists 保护)
-- ================================================================

-- 7. SCHEDULED PUSHES (定时 / 自动化推送队列)
create table if not exists public.scheduled_pushes (
  id            uuid primary key default gen_random_uuid(),
  merchant_id   uuid not null references public.merchants(id) on delete cascade,
  title         text not null,
  body          text not null,
  scheduled_at  timestamptz not null,                 -- 计划发送时间
  status        text not null default 'pending'
                check (status in ('pending','sent','failed','cancelled')),
  sent_count    integer not null default 0,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);

create index if not exists idx_sched_merchant on public.scheduled_pushes(merchant_id);
create index if not exists idx_sched_due       on public.scheduled_pushes(status, scheduled_at);

-- 8. BRANCHES (门店 — 一个商户可有多个门店)
create table if not exists public.branches (
  id            uuid primary key default gen_random_uuid(),
  merchant_id   uuid not null references public.merchants(id) on delete cascade,
  name          text not null,
  created_at    timestamptz not null default now(),
  unique(merchant_id, name)
);

create index if not exists idx_branches_merchant on public.branches(merchant_id);

-- RLS (与现有表一致: app 层负责鉴权)
alter table public.scheduled_pushes enable row level security;
alter table public.branches         enable row level security;

drop policy if exists "open_sched"    on public.scheduled_pushes;
drop policy if exists "open_branches" on public.branches;
create policy "open_sched"    on public.scheduled_pushes for all using (true) with check (true);
create policy "open_branches" on public.branches         for all using (true) with check (true);

-- 为已有商户回填一个默认门店 (取其现有 staff.branch, 否则用 'Main Branch')
insert into public.branches (merchant_id, name)
select distinct m.id, coalesce(
         (select s.branch from public.staff s where s.merchant_id = m.id limit 1),
         'Main Branch')
from public.merchants m
on conflict (merchant_id, name) do nothing;
