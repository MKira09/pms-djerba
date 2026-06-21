-- =========================================================
-- PMS Djerba — Initial Schema
-- =========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- TENANTS (one per gestionnaire account)
-- ─────────────────────────────────────────
create table tenants (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  plan        text not null default 'starter' check (plan in ('starter','pro','agence')),
  trial_ends  timestamptz,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- PROFILES (linked to supabase auth.users)
-- ─────────────────────────────────────────
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  tenant_id  uuid not null references tenants(id) on delete cascade,
  full_name  text,
  role       text not null default 'admin' check (role in ('admin','manager','agent')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- VILLAS
-- ─────────────────────────────────────────
create table villas (
  id               uuid primary key default uuid_generate_v4(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  name             text not null,
  description      text,
  address          text,
  city             text default 'Djerba',
  capacity         int not null default 4,
  bedrooms         int not null default 2,
  bathrooms        int not null default 1,
  base_price       numeric(10,3) not null,
  status           text not null default 'active' check (status in ('active','maintenance','disabled')),
  amenities        jsonb default '[]',
  access_code      text,
  arrival_info     text,
  photos           jsonb default '[]',
  wifi_password    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- SEASONAL PRICING
-- ─────────────────────────────────────────
create table seasonal_rates (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  multiplier  numeric(4,2) not null default 1.0,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────
create table clients (
  id             uuid primary key default uuid_generate_v4(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  full_name      text not null,
  email          text,
  phone          text,
  nationality    text,
  preferred_lang text default 'fr',
  created_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- RESERVATIONS
-- ─────────────────────────────────────────
create table reservations (
  id             uuid primary key default uuid_generate_v4(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  villa_id       uuid not null references villas(id) on delete restrict,
  client_id      uuid references clients(id),
  check_in       date not null,
  check_out      date not null,
  guests         int not null default 1,
  total_amount   numeric(10,3) not null,
  currency       text not null default 'TND',
  source         text not null default 'direct' check (source in ('airbnb','booking','direct','whatsapp','vrbo','autre')),
  status         text not null default 'pending' check (status in ('confirmed','pending','cancelled','checkout')),
  internal_note  text,
  ical_uid       text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint no_overlap exclude using gist (
    villa_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status != 'cancelled')
);

-- ─────────────────────────────────────────
-- TEAM MEMBERS
-- ─────────────────────────────────────────
create table team_members (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  full_name    text not null,
  role         text not null default 'cleaner' check (role in ('manager','cleaner','maintenance','inspector')),
  phone        text,
  email        text,
  assigned_villa_ids uuid[] default '{}',
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- CLEANING TASKS
-- ─────────────────────────────────────────
create table cleaning_tasks (
  id             uuid primary key default uuid_generate_v4(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  villa_id       uuid not null references villas(id) on delete cascade,
  reservation_id uuid references reservations(id),
  assigned_to    uuid references team_members(id),
  task_type      text not null default 'full' check (task_type in ('full','quick','maintenance','inspection')),
  scheduled_date date not null,
  status         text not null default 'todo' check (status in ('todo','in_progress','done','issue')),
  checklist      jsonb default '[]',
  photos         jsonb default '[]',
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- EMAIL TEMPLATES
-- ─────────────────────────────────────────
create table email_templates (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  trigger     text not null check (trigger in ('booking_confirmed','reminder_checkin','welcome','review_request')),
  lang        text not null default 'fr',
  subject     text not null,
  body        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────

alter table tenants         enable row level security;
alter table profiles        enable row level security;
alter table villas          enable row level security;
alter table seasonal_rates  enable row level security;
alter table clients         enable row level security;
alter table reservations    enable row level security;
alter table team_members    enable row level security;
alter table cleaning_tasks  enable row level security;
alter table email_templates enable row level security;

-- Helper: get caller's tenant
create or replace function auth_tenant_id() returns uuid as $$
  select tenant_id from profiles where id = auth.uid()
$$ language sql security definer stable;

-- Policies — each tenant sees only their own data
create policy "tenant_isolation" on villas         using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on seasonal_rates using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on clients        using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on reservations   using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on team_members   using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on cleaning_tasks using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on email_templates using (tenant_id = auth_tenant_id());

create policy "own_profile" on profiles using (tenant_id = auth_tenant_id());

-- ─────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger villas_updated_at         before update on villas         for each row execute function set_updated_at();
create trigger reservations_updated_at   before update on reservations   for each row execute function set_updated_at();
create trigger cleaning_tasks_updated_at before update on cleaning_tasks for each row execute function set_updated_at();

-- ─────────────────────────────────────────
-- FUNCTION: register new tenant on signup
-- ─────────────────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
declare
  new_tenant_id uuid;
begin
  insert into tenants (name, plan, trial_ends)
  values (
    coalesce(new.raw_user_meta_data->>'company_name', split_part(new.email, '@', 1)),
    'starter',
    now() + interval '14 days'
  )
  returning id into new_tenant_id;

  insert into profiles (id, tenant_id, full_name, role)
  values (
    new.id,
    new_tenant_id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'admin'
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
