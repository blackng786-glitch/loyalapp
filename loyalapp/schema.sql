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
  brand_color    text not null default '#C9A84C',    -- hex color
  logo_text      text not null default 'LOYAL',      -- short brand name on card
  stamps_per_card integer not null default 10,
  reward_name    text not null default 'Free Item',
  reward_value   text not null default '',           -- e.g. "RM35 value"
  services       text[] not null default array['Service'],
  plan           text not null default 'free'
                 check (plan in ('free','basic','pro')),
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

-- INDEXES
create index idx_members_merchant  on public.members(merchant_id);
create index idx_stamps_member     on public.stamps(member_id);
create index idx_stamps_merchant   on public.stamps(merchant_id);
create index idx_stamps_created    on public.stamps(created_at desc);
create index idx_redemptions_member on public.redemptions(member_id);
create index idx_push_member       on public.push_subscriptions(member_id);

-- ROW LEVEL SECURITY (open via anon key — app-layer auth handles security)
alter table public.merchants         enable row level security;
alter table public.staff             enable row level security;
alter table public.members           enable row level security;
alter table public.stamps            enable row level security;
alter table public.redemptions       enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "open_merchants"     on public.merchants          for all using (true) with check (true);
create policy "open_staff"         on public.staff              for all using (true) with check (true);
create policy "open_members"       on public.members            for all using (true) with check (true);
create policy "open_stamps"        on public.stamps             for all using (true) with check (true);
create policy "open_redemptions"   on public.redemptions        for all using (true) with check (true);
create policy "open_push"          on public.push_subscriptions for all using (true) with check (true);

-- ================================================================
-- DEMO SEED DATA (optional — delete before production)
-- ================================================================
-- insert into public.merchants (name, slug, email, brand_color, logo_text, stamps_per_card, reward_name, reward_value, services)
-- values ('Neue Car Spa', 'neue-car-spa', 'jonas@neuecarspa.com', '#C9A84C', 'NEUE', 10, 'Free Basic Wash', 'RM35 value',
--   array['Basic Wash (RM35)','Full Polish (RM180)','Interior Detailing (RM120)','Window Tinting','Ceramic Coating']);
