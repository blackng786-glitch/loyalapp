-- ================================================================
-- LOYALAPP — MULTI-TENANT LOYALTY SAAS
-- Run in Supabase SQL Editor
-- ================================================================

-- 1. MERCHANTS (businesses that sign up)
create table public.merchants (
  id             uuid primary key default gen_random_uuid(),
  auth_id        uuid unique,                        -- Supabase Auth user ID
  name           text not null,                      -- "Neue Car Spa"
  slug           text not null unique,               -- "neue-car-spa"
  email          text not null unique,
  brand_color    text not null default '#993C1D',    -- hex color (card fill)
  bg_color       text,                               -- 顾客卡页面背景色 (可空=自动)
  logo_url       text,                               -- 商家 logo (Supabase Storage URL)
  logo_text      text not null default 'LOYAL',      -- short brand name on card
  stamps_per_card integer not null default 10,
  reward_name    text not null default 'Free Item',
  reward_value   text not null default '',           -- e.g. "RM35 value"
  services       text[] not null default array['Service'],
  plan           text not null default 'free'
                 check (plan in ('free','basic','pro')),
  feature_stamp   boolean not null default true,
  feature_bottle  boolean not null default false,
  feature_voucher boolean not null default false,
  created_at     timestamptz not null default now()
);

-- 2. STAFF (per merchant, multiple allowed)
create table public.staff (
  id          uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name        text not null default 'Staff',
  pin         text not null default '1234',
  branch      text not null default 'Main Branch',
  created_at  timestamptz not null default now()
);

-- 3. MEMBERS (customers of each merchant)
create table public.members (
  id          uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name        text not null,
  phone       text not null,
  tier        text not null default 'Bronze',
  created_at  timestamptz not null default now(),
  unique(merchant_id, phone)
);

-- 4. STAMPS (each visit)
create table public.stamps (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  service     text not null,
  branch      text not null default 'Main Branch',
  staff_name  text not null default 'Staff',
  created_at  timestamptz not null default now()
);

-- 5. REDEMPTIONS
create table public.redemptions (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  reward_name text not null,
  created_at  timestamptz not null default now()
);

-- 6. PUSH SUBSCRIPTIONS (for web push notifications)
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  subscription jsonb not null,
  created_at  timestamptz not null default now(),
  unique(member_id)
);

-- 7. SCHEDULED PUSHES (定时 / 自动化推送队列)
create table public.scheduled_pushes (
  id            uuid primary key default gen_random_uuid(),
  merchant_id   uuid not null references public.merchants(id) on delete cascade,
  title         text not null,
  body          text not null,
  scheduled_at  timestamptz not null,
  status        text not null default 'pending'
                check (status in ('pending','sent','failed','cancelled')),
  sent_count    integer not null default 0,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);

-- 8. BRANCHES (门店)
create table public.branches (
  id            uuid primary key default gen_random_uuid(),
  merchant_id   uuid not null references public.merchants(id) on delete cascade,
  name          text not null,
  created_at    timestamptz not null default now(),
  unique(merchant_id, name)
);

-- 9. BOTTLE KEEPS (存酒)
create table public.bottle_keeps (
  id            uuid primary key default gen_random_uuid(),
  merchant_id   uuid not null references public.merchants(id) on delete cascade,
  member_id     uuid not null references public.members(id) on delete cascade,
  brand         text not null,
  size_ml       integer not null,
  remaining_ml  integer not null,
  photo_url     text,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 10. BOTTLE TRANSACTIONS (存酒流水)
create table public.bottle_transactions (
  id              uuid primary key default gen_random_uuid(),
  bottle_keep_id  uuid not null references public.bottle_keeps(id) on delete cascade,
  type            text not null check (type in ('deposit','pour','adjust','expired')),
  amount_ml       integer not null,
  note            text,
  staff_id        uuid,
  created_at      timestamptz not null default now()
);

-- 11. VOUCHERS (储值券)
create table public.vouchers (
  id            uuid primary key default gen_random_uuid(),
  merchant_id   uuid not null references public.merchants(id) on delete cascade,
  member_id     uuid not null references public.members(id) on delete cascade,
  type          text not null check (type in ('session','credit')) default 'session',
  label         text,
  total         numeric not null,
  remaining     numeric not null,
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);

-- 12. VOUCHER TRANSACTIONS (储值券流水)
create table public.voucher_transactions (
  id          uuid primary key default gen_random_uuid(),
  voucher_id  uuid not null references public.vouchers(id) on delete cascade,
  type        text not null check (type in ('issue','redeem','adjust')),
  amount      numeric not null,
  note        text,
  staff_id    uuid,
  created_at  timestamptz not null default now()
);

-- TRIGGER: auto-update bottle_keeps.updated_at
create or replace function update_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;

create trigger trg_bottle_keeps_updated
  before update on bottle_keeps
  for each row execute function update_updated_at();

-- INDEXES
create index idx_members_merchant  on public.members(merchant_id);
create index idx_sched_merchant    on public.scheduled_pushes(merchant_id);
create index idx_sched_due         on public.scheduled_pushes(status, scheduled_at);
create index idx_branches_merchant on public.branches(merchant_id);
create index idx_stamps_member     on public.stamps(member_id);
create index idx_stamps_merchant   on public.stamps(merchant_id);
create index idx_stamps_created    on public.stamps(created_at desc);
create index idx_redemptions_member on public.redemptions(member_id);
create index idx_push_member       on public.push_subscriptions(member_id);
create index idx_bottle_member     on public.bottle_keeps(member_id);
create index idx_bottle_merchant   on public.bottle_keeps(merchant_id);
create index idx_bottle_expires    on public.bottle_keeps(expires_at);
create index idx_btx_keep          on public.bottle_transactions(bottle_keep_id);
create index idx_voucher_member    on public.vouchers(member_id);
create index idx_voucher_merchant  on public.vouchers(merchant_id);
create index idx_vtx_voucher      on public.voucher_transactions(voucher_id);

-- ROW LEVEL SECURITY — 默认拒绝 (deny-by-default)
-- 不创建任何 policy: anon key 无法读写任何表。
-- 全部数据操作经 server.js (service key, 绕过 RLS) + 应用层鉴权:
--   商家 dashboard → Supabase Auth JWT; 员工 → PIN; 顾客 → OTP 签发的 HMAC token。
alter table public.merchants         enable row level security;
alter table public.staff             enable row level security;
alter table public.members           enable row level security;
alter table public.stamps            enable row level security;
alter table public.redemptions       enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.scheduled_pushes  enable row level security;
alter table public.branches              enable row level security;
alter table public.bottle_keeps          enable row level security;
alter table public.bottle_transactions   enable row level security;
alter table public.vouchers              enable row level security;
alter table public.voucher_transactions  enable row level security;

-- ================================================================
-- DEMO SEED DATA (optional — delete before production)
-- ================================================================
-- insert into public.merchants (name, slug, email, brand_color, logo_text, stamps_per_card, reward_name, reward_value, services)
-- values ('Neue Car Spa', 'neue-car-spa', 'jonas@neuecarspa.com', '#C9A84C', 'NEUE', 10, 'Free Basic Wash', 'RM35 value',
--   array['Basic Wash (RM35)','Full Polish (RM180)','Interior Detailing (RM120)','Window Tinting','Ceramic Coating']);
